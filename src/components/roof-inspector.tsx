'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RooftopData } from '@/types';
import {
  DEFAULT_ROOF_POLYGON,
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  buildRooftopImageUrl,
  calculateMapPolygonAreaM2,
  chooseZoomForGeoPolygon,
  clampRooftopZoom,
  fitPolygonToArea,
  metersPerMapUnit,
  offsetGeoPointByMeters,
  polygonToPointsAttr,
  projectPolygonToViewBox,
  readMapZoom,
  scalePolygonAboutCenter,
  scalePolygonAboutCentroid,
  updateMapZoom,
  type MapPoint,
} from '@/lib/satellite-map';
import { cn } from '@/lib/utils';
import { cn, buildStaticMapUrl } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';
import {
  DEFAULT_ROOF_UTILIZATION_FACTOR,
  calculateUsableRoofArea,
} from '@/lib/solar-calculator';

const DEFAULT_LAT = 30.0384;
const DEFAULT_LNG = 31.2118;
const DEFAULT_AREA_M2 = 180;
const DEFAULT_USABLE_AREA_M2 = calculateUsableRoofArea(DEFAULT_AREA_M2);
const DEFAULT_ZOOM = 19;

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    /^127\./.test(normalized)
  );
}

function isPrivateHostname(hostname: string): boolean {
  if (isLoopbackHostname(hostname)) return true;

  const normalized = normalizeHostname(hostname);
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(normalized)
  );
}

/** How far the view can travel across the 3x3 surrounding imagery grid. */
const PAN_LIMIT_X = MAP_VIEWBOX_WIDTH - 20;
const PAN_LIMIT_Y = MAP_VIEWBOX_HEIGHT - 15;
const MAP_WORLD_MIN_X = -MAP_VIEWBOX_WIDTH;
const MAP_WORLD_MAX_X = MAP_VIEWBOX_WIDTH * 2;
const MAP_WORLD_MIN_Y = -MAP_VIEWBOX_HEIGHT;
const MAP_WORLD_MAX_Y = MAP_VIEWBOX_HEIGHT * 2;
const INERTIA_FRICTION = 0.94;
const INERTIA_MIN_VELOCITY = 0.015;

type DragMode = 'draw' | 'vertex' | 'polygon' | 'pan';
type MapTool = 'pan' | 'draw';

interface DragState {
  mode: DragMode;
  vertexIndex?: number;
  start: MapPoint;
  current: MapPoint;
  panStart?: MapPoint;
  polygonStart?: MapPoint[];
  lastPointer?: MapPoint;
  lastTime?: number;
  velocity?: MapPoint;
}

function clampMapPoint(point: MapPoint): MapPoint {
  return {
    x: Math.max(MAP_WORLD_MIN_X, Math.min(MAP_WORLD_MAX_X, point.x)),
    y: Math.max(MAP_WORLD_MIN_Y, Math.min(MAP_WORLD_MAX_Y, point.y)),
  };
}

function clampPanOffset(point: MapPoint): MapPoint {
  return {
    x: Math.max(-PAN_LIMIT_X, Math.min(PAN_LIMIT_X, point.x)),
    y: Math.max(-PAN_LIMIT_Y, Math.min(PAN_LIMIT_Y, point.y)),
  };
}

/** Keeps the selection stroke and handles inside the map viewport. */
const SELECTION_EDGE_PADDING = 8;

interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getPolygonBounds(points: readonly MapPoint[]): MapBounds {
  if (points.length === 0) {
    return {
      minX: MAP_VIEWBOX_WIDTH / 2,
      maxX: MAP_VIEWBOX_WIDTH / 2,
      minY: MAP_VIEWBOX_HEIGHT / 2,
      maxY: MAP_VIEWBOX_HEIGHT / 2,
    };
  }

  return points.reduce(
    (bounds, vertex) => ({
      minX: Math.min(bounds.minX, vertex.x),
      maxX: Math.max(bounds.maxX, vertex.x),
      minY: Math.min(bounds.minY, vertex.y),
      maxY: Math.max(bounds.maxY, vertex.y),
    }),
    {
      minX: points[0].x,
      maxX: points[0].x,
      minY: points[0].y,
      maxY: points[0].y,
    }
  );
}

function clampToRange(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

function getVisibleSelectionBounds(pan: MapPoint): MapBounds {
  return {
    minX: SELECTION_EDGE_PADDING - pan.x,
    maxX: MAP_VIEWBOX_WIDTH - SELECTION_EDGE_PADDING - pan.x,
    minY: SELECTION_EDGE_PADDING - pan.y,
    maxY: MAP_VIEWBOX_HEIGHT - SELECTION_EDGE_PADDING - pan.y,
  };
}

function clampPointToBounds(point: MapPoint, bounds: MapBounds): MapPoint {
  return {
    x: clampToRange(point.x, bounds.minX, bounds.maxX),
    y: clampToRange(point.y, bounds.minY, bounds.maxY),
  };
}

function shiftPolygonIntoVisibleBounds(
  points: readonly MapPoint[],
  pan: MapPoint
): MapPoint[] {
  const bounds = getPolygonBounds(points);
  const visible = getVisibleSelectionBounds(pan);
  const deltaX = clampToRange(
    0,
    visible.minX - bounds.minX,
    visible.maxX - bounds.maxX
  );
  const deltaY = clampToRange(
    0,
    visible.minY - bounds.minY,
    visible.maxY - bounds.maxY
  );

  return points.map((point) => ({
    x: point.x + deltaX,
    y: point.y + deltaY,
  }));
}

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AddressSuggestion {
  label: string;
  subLabel?: string;
  query?: string;
  lat?: number;
  lng?: number;
  category: "industrial" | "commercial" | "hub" | "general";
}

export interface RoofInspectorProps {
  monthlySpendEgp: number;
  monthlyKwh: number;
  onConfirm: (data: RooftopData) => void;
  onBack: () => void;
  className?: string;
}

export function RoofInspector({
  monthlySpendEgp,
  monthlyKwh,
  onConfirm,
  onBack,
  className,
}: RoofInspectorProps) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [suggestionsNotice, setSuggestionsNotice] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const [hasEditedAddress, setHasEditedAddress] = useState(false);
  const [manualAreaM2, setManualAreaM2] = useState(DEFAULT_AREA_M2);
  const [detectedUsableAreaM2, setDetectedUsableAreaM2] = useState(
    DEFAULT_USABLE_AREA_M2
  );
  const [isAreaOverridden, setIsAreaOverridden] = useState(false);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [rooftopData, setRooftopData] = useState<RooftopData>(() => ({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    formattedAddress: '',
    roofAreaM2: DEFAULT_AREA_M2,
    usableAreaM2: DEFAULT_USABLE_AREA_M2,
    areaUtilizationFactor: DEFAULT_ROOF_UTILIZATION_FACTOR,
    polygonAreaM2: DEFAULT_AREA_M2,
    staticMapUrl: buildRooftopImageUrl({
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      zoom: DEFAULT_ZOOM,
      area: DEFAULT_AREA_M2,
    }),
    meta: {
      areaSource: 'manual',
      usableAreaSource: 'utilization_factor',
      zoom: DEFAULT_ZOOM,
    },
  }));

  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isZoomAdjusted, setIsZoomAdjusted] = useState(false);
  const [roofPolygon, setRoofPolygon] = useState<MapPoint[]>(() =>
    fitPolygonToArea(
      DEFAULT_ROOF_POLYGON,
      DEFAULT_AREA_M2,
      DEFAULT_LAT,
      DEFAULT_ZOOM
    )
  );
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
  const [panOffset, setPanOffset] = useState<MapPoint>({ x: 0, y: 0 });
  const [mapTool, setMapTool] = useState<MapTool>('pan');
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [showSurroundingTiles, setShowSurroundingTiles] = useState(false);
  const roofPolygonRef = useRef<MapPoint[]>(roofPolygon);
  const panOffsetRef = useRef<MapPoint>(panOffset);
  const dragRef = useRef<DragState | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const geocodeRequestRef = useRef(0);
  const locateRequestRef = useRef(0);

  const stopInertia = () => {
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    setIsMapDragging(false);
  };

  useEffect(() => {
    return () => {
      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
      }
    };
  }, []);

  // Keep the selection fully visible whenever its geometry changes (geocode,
  // area/zoom changes, or a restored dev session).
  useEffect(() => {
    const bounds = getPolygonBounds(roofPolygon);
    const current = panOffsetRef.current;
    const next = {
      x: clampToRange(
        current.x,
        SELECTION_EDGE_PADDING - bounds.minX,
        MAP_VIEWBOX_WIDTH - SELECTION_EDGE_PADDING - bounds.maxX
      ),
      y: clampToRange(
        current.y,
        SELECTION_EDGE_PADDING - bounds.minY,
        MAP_VIEWBOX_HEIGHT - SELECTION_EDGE_PADDING - bounds.maxY
      ),
    };

    if (next.x !== current.x || next.y !== current.y) {
      panOffsetRef.current = next;
      setPanOffset(next);
    }
  }, [roofPolygon]);

  useEffect(() => {
    if (!showSuggestions) return;
    if (!hasEditedAddress && address.trim().length > 0) return;

    const controller = new AbortController();
    const query = address.trim();
    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      setSuggestionsNotice(null);
      try {
        const res = await fetch(
          `/api/address-suggestions?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error("suggestions request failed");
        }

        const nextSuggestions: AddressSuggestion[] = Array.isArray(json.data)
          ? json.data
          : [];
        setSuggestions(nextSuggestions);

        if (nextSuggestions.length === 0) {
          setSuggestionsNotice(
            "لا توجد نتائج مطابقة لهذا العنوان. يمكنك المتابعة بالعنوان الحالي، وسيتم استخدام بيانات تجريبية عند تعذر تحديد الموقع."
          );
        } else if (json.meta?.fallbackUsed) {
          setSuggestionsNotice(
            json.meta.message ||
              "تعذر تحميل الاقتراحات الحالية، ويتم عرض مناطق تجريبية بدلًا منها."
          );
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsNotice(
            "تعذر تحميل الاقتراحات. يمكنك المتابعة بالعنوان الحالي، وسيتم استخدام بيانات تجريبية عند الحاجة."
          );
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address, hasEditedAddress, showSuggestions]);

  const usableAreaM2 = isAreaOverridden
    ? calculateUsableRoofArea(manualAreaM2)
    : detectedUsableAreaM2;

  // Capacity calculation (~9 m² of usable roof per 1 kW)
  const capacityKw = Math.round(usableAreaM2 / 9);
  const roofUtilizationPercent = Math.round(
    (usableAreaM2 / Math.max(1, manualAreaM2)) * 100
  );

  // Teaser annual savings and payback estimate
  const teaserSavings = Math.round((monthlySpendEgp * 0.8) * 12 * 0.7);
  const paybackYears = Math.max(
    2.5,
    Math.round(((capacityKw * 28000) / (Math.max(1, teaserSavings))) * 10) / 10
  );

  const polygonCenter = roofPolygon.reduce(
    (accumulator, vertex) => ({
      x: accumulator.x + vertex.x / Math.max(1, roofPolygon.length),
      y: accumulator.y + vertex.y / Math.max(1, roofPolygon.length),
    }),
    { x: 0, y: 0 }
  );

  // Selection-relative grid, recomputed from the live vertices on every render.
  const polygonBounds = getPolygonBounds(roofPolygon);
  const selectionWidth = Math.max(1, polygonBounds.maxX - polygonBounds.minX);
  const selectionHeight = Math.max(1, polygonBounds.maxY - polygonBounds.minY);
  const gridCellSize = 56;
  const gridColumns = Math.min(
    10,
    Math.max(2, Math.round(selectionWidth / gridCellSize))
  );
  const gridRows = Math.min(
    10,
    Math.max(2, Math.round(selectionHeight / gridCellSize))
  );
  const quad = roofPolygon.length === 4 ? roofPolygon : null;
  const verticalGridSegments: {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }[] = [];
  const horizontalGridSegments: typeof verticalGridSegments = [];
  if (quad) {
    const [topLeft, topRight, bottomRight, bottomLeft] = quad;
    for (let index = 1; index < gridColumns; index++) {
      const ratio = index / gridColumns;
      verticalGridSegments.push({
        key: `grid-v-${index}`,
        x1: topLeft.x + (topRight.x - topLeft.x) * ratio,
        y1: topLeft.y + (topRight.y - topLeft.y) * ratio,
        x2: bottomLeft.x + (bottomRight.x - bottomLeft.x) * ratio,
        y2: bottomLeft.y + (bottomRight.y - bottomLeft.y) * ratio,
      });
    }
    for (let index = 1; index < gridRows; index++) {
      const ratio = index / gridRows;
      horizontalGridSegments.push({
        key: `grid-h-${index}`,
        x1: topLeft.x + (bottomLeft.x - topLeft.x) * ratio,
        y1: topLeft.y + (bottomLeft.y - topLeft.y) * ratio,
        x2: topRight.x + (bottomRight.x - topRight.x) * ratio,
        y2: topRight.y + (bottomRight.y - topRight.y) * ratio,
      });
    }
  }

  const selectionPointsAttr = polygonToPointsAttr(
    roofPolygon.map((point) => ({
      x: point.x + panOffset.x,
      y: point.y + panOffset.y,
    }))
  );

  const surroundingTiles = useMemo(() => {
    if (!showSurroundingTiles) return [];

    const staticMapUrl = rooftopData.staticMapUrl;
    const isGoogleStaticMap =
      Boolean(staticMapUrl) &&
      /^https?:\/\/[^/]*googleapis\.com\/maps\/api\/staticmap/i.test(
        staticMapUrl as string
      );
    const latRadians = (rooftopData.lat * Math.PI) / 180;
    const mercatorFactor = isGoogleStaticMap
      ? 1 / Math.max(0.2, Math.cos(latRadians))
      : 1;

    const metersPerUnit = metersPerMapUnit(rooftopData.lat, zoomLevel);
    const tileWidthMeters =
      metersPerUnit * MAP_VIEWBOX_WIDTH * mercatorFactor;
    const tileHeightMeters =
      metersPerUnit * MAP_VIEWBOX_HEIGHT * mercatorFactor;
    const tileAreaM2 = rooftopData.roofAreaM2 || rooftopData.polygonAreaM2;
    const tiles: { key: string; url: string; left: number; top: number }[] = [];

    const buildTileUrl = (lat: number, lng: number) => {
      if (isGoogleStaticMap && staticMapUrl) {
        try {
          const url = new URL(staticMapUrl);
          url.searchParams.set("center", `${lat},${lng}`);
          url.searchParams.set("zoom", String(clampRooftopZoom(zoomLevel)));
          url.searchParams.delete("markers");
          url.searchParams.delete("path");
          return url.toString();
        } catch {
          // Fall through to the internal satellite endpoint.
        }
      }

      return buildRooftopImageUrl({
        lat,
        lng,
        zoom: zoomLevel,
        area: tileAreaM2,
        tile: true,
      });
    };

    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        if (row === 0 && col === 0) continue;
        const tileCenter = offsetGeoPointByMeters(
          { lat: rooftopData.lat, lng: rooftopData.lng },
          col * tileWidthMeters,
          -row * tileHeightMeters
        );
        tiles.push({
          key: `${col}:${row}`,
          url: buildTileUrl(tileCenter.lat, tileCenter.lng),
          left: col * 100,
          top: row * 100,
        });
      }
    }

    return tiles;
  }, [
    showSurroundingTiles,
    rooftopData.lat,
    rooftopData.lng,
    rooftopData.roofAreaM2,
    rooftopData.polygonAreaM2,
    rooftopData.staticMapUrl,
    zoomLevel,
  ]);

  const applyPolygon = (points: MapPoint[]) => {
    roofPolygonRef.current = points;
    setRoofPolygon(points);
  };

  const setPolygonAndArea = (points: MapPoint[]) => {
    applyPolygon(points);
    const nextArea = calculateMapPolygonAreaM2(points, rooftopData.lat, zoomLevel);
    if (nextArea > 0) {
      setManualAreaM2(nextArea);
      setIsAreaOverridden(true);
    }
  };

  const applyPanOffset = (next: MapPoint) => {
    const requested = clampPanOffset(next);
    const bounds = getPolygonBounds(roofPolygonRef.current);
    const clamped = {
      x: clampToRange(
        requested.x,
        SELECTION_EDGE_PADDING - bounds.minX,
        MAP_VIEWBOX_WIDTH - SELECTION_EDGE_PADDING - bounds.maxX
      ),
      y: clampToRange(
        requested.y,
        SELECTION_EDGE_PADDING - bounds.minY,
        MAP_VIEWBOX_HEIGHT - SELECTION_EDGE_PADDING - bounds.maxY
      ),
    };
    panOffsetRef.current = clamped;
    setPanOffset(clamped);
    return clamped;
  };

  const startPanInertia = (initialVelocity: MapPoint) => {
    stopInertia();
    setIsMapDragging(true);
    let velocity = { ...initialVelocity };
    let lastTime = performance.now();

    const step = (now: number) => {
      const elapsed = Math.min(64, Math.max(0, now - lastTime));
      lastTime = now;
      const decay = Math.pow(INERTIA_FRICTION, elapsed / 16.67);
      velocity = { x: velocity.x * decay, y: velocity.y * decay };

      const current = panOffsetRef.current;
      const target = {
        x: current.x + velocity.x * elapsed,
        y: current.y + velocity.y * elapsed,
      };
      const clamped = applyPanOffset(target);
      if (clamped.x !== target.x) velocity.x = 0;
      if (clamped.y !== target.y) velocity.y = 0;

      if (Math.hypot(velocity.x, velocity.y) > INERTIA_MIN_VELOCITY) {
        inertiaFrameRef.current = requestAnimationFrame(step);
      } else {
        inertiaFrameRef.current = null;
        setIsMapDragging(false);
      }
    };

    inertiaFrameRef.current = requestAnimationFrame(step);
  };

  /** Raw pointer position in the untranslated map viewport's viewBox units. */
  const getPointerPoint = (event: React.PointerEvent<SVGSVGElement>): MapPoint => {
    const rect =
      mapViewportRef.current?.getBoundingClientRect() ??
      event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * MAP_VIEWBOX_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * MAP_VIEWBOX_HEIGHT,
    };
  };

  /** Pointer position relative to the panned map imagery. */
  const getMapPoint = (event: React.PointerEvent<SVGSVGElement>): MapPoint => {
    const pointer = getPointerPoint(event);
    return clampMapPoint({
      x: pointer.x - panOffsetRef.current.x,
      y: pointer.y - panOffsetRef.current.y,
    });
  };

  const handleMapPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    stopInertia();
    const pointer = getPointerPoint(event);
    const point = clampMapPoint({
      x: pointer.x - panOffsetRef.current.x,
      y: pointer.y - panOffsetRef.current.y,
    });
    const target = event.target as SVGElement;
    const getAttr = (name: string) =>
      typeof target.getAttribute === 'function' ? target.getAttribute(name) : null;
    const vertexAttr = getAttr('data-vertex');
    const vertexIndex = vertexAttr === null ? Number.NaN : Number(vertexAttr);
    const isVertex = Number.isInteger(vertexIndex);
    const isPolygon = getAttr('data-polygon') !== null;

    const mode: DragMode = isVertex
      ? 'vertex'
      : mapTool === 'draw'
        ? 'draw'
        : isPolygon
          ? 'polygon'
          : 'pan';

    event.currentTarget.setPointerCapture(event.pointerId);
    const drawStart =
      mode === 'draw'
        ? clampPointToBounds(
            point,
            getVisibleSelectionBounds(panOffsetRef.current)
          )
        : null;
    dragRef.current = {
      mode,
      vertexIndex: isVertex ? vertexIndex : undefined,
      start: mode === 'pan' ? pointer : drawStart ?? point,
      current: point,
      panStart: { ...panOffsetRef.current },
      polygonStart:
        mode === 'polygon'
          ? roofPolygonRef.current.map((vertex) => ({ ...vertex }))
          : undefined,
      lastPointer: pointer,
      lastTime: performance.now(),
      velocity: { x: 0, y: 0 },
    };
    setIsMapDragging(true);

    if (mode === 'pan') {
      setShowSurroundingTiles(true);
    }

    if (drawStart) {
      setDraftRect({ x: drawStart.x, y: drawStart.y, width: 0, height: 0 });
    }
  };

  const handleMapPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const pointer = getPointerPoint(event);
    const point = clampMapPoint({
      x: pointer.x - panOffsetRef.current.x,
      y: pointer.y - panOffsetRef.current.y,
    });
    drag.current = point;

    const visibleBounds = getVisibleSelectionBounds(panOffsetRef.current);

    if (drag.mode === 'vertex' && drag.vertexIndex !== undefined) {
      const vertexPoint = clampPointToBounds(point, visibleBounds);
      const nextPolygon = roofPolygonRef.current.map((vertex, index) =>
        index === drag.vertexIndex ? vertexPoint : vertex
      );
      setPolygonAndArea(nextPolygon);
      return;
    }

    if (drag.mode === 'polygon' && drag.polygonStart) {
      const bounds = getPolygonBounds(drag.polygonStart);
      const deltaX = clampToRange(
        point.x - drag.start.x,
        visibleBounds.minX - bounds.minX,
        visibleBounds.maxX - bounds.maxX
      );
      const deltaY = clampToRange(
        point.y - drag.start.y,
        visibleBounds.minY - bounds.minY,
        visibleBounds.maxY - bounds.maxY
      );
      applyPolygon(
        drag.polygonStart.map((vertex) => ({
          x: vertex.x + deltaX,
          y: vertex.y + deltaY,
        }))
      );
      return;
    }

    if (drag.mode === 'pan') {
      const now = performance.now();
      const elapsed = Math.max(1, now - (drag.lastTime ?? now));
      if (drag.lastPointer) {
        const instant = {
          x: (pointer.x - drag.lastPointer.x) / elapsed,
          y: (pointer.y - drag.lastPointer.y) / elapsed,
        };
        const previous = drag.velocity ?? { x: 0, y: 0 };
        drag.velocity = {
          x: previous.x * 0.6 + instant.x * 0.4,
          y: previous.y * 0.6 + instant.y * 0.4,
        };
      }
      drag.lastPointer = pointer;
      drag.lastTime = now;

      const startPan = drag.panStart ?? { x: 0, y: 0 };
      applyPanOffset({
        x: startPan.x + pointer.x - drag.start.x,
        y: startPan.y + pointer.y - drag.start.y,
      });
      return;
    }

    const drawPoint = clampPointToBounds(point, visibleBounds);
    setDraftRect({
      x: Math.min(drag.start.x, drawPoint.x),
      y: Math.min(drag.start.y, drawPoint.y),
      width: Math.abs(drawPoint.x - drag.start.x),
      height: Math.abs(drawPoint.y - drag.start.y),
    });
  };

  const finishMapDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    dragRef.current = null;
    setIsMapDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.mode === 'pan') {
      const idleMs = performance.now() - (drag.lastTime ?? 0);
      const velocity = idleMs > 90 ? { x: 0, y: 0 } : drag.velocity ?? { x: 0, y: 0 };
      if (Math.hypot(velocity.x, velocity.y) > 0.02) {
        startPanInertia(velocity);
      }
      return;
    }

    if (drag.mode !== 'draw') return;

    setDraftRect(null);
    const point = clampPointToBounds(
      getMapPoint(event),
      getVisibleSelectionBounds(panOffsetRef.current)
    );
    const width = Math.abs(point.x - drag.start.x);
    const height = Math.abs(point.y - drag.start.y);
    if (width < 8 || height < 8) return;

    const x = Math.min(drag.start.x, point.x);
    const y = Math.min(drag.start.y, point.y);
    setPolygonAndArea([
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]);
  };

  const cancelMapDrag = () => {
    stopInertia();
    dragRef.current = null;
    setIsMapDragging(false);
    setDraftRect(null);
  };

  const mapBaseUrl =
    rooftopData.staticMapUrl ??
    buildRooftopImageUrl({
      lat: rooftopData.lat,
      lng: rooftopData.lng,
      zoom: zoomLevel,
      area: manualAreaM2,
      address: rooftopData.formattedAddress,
    });
  const mapImageUrl = isZoomAdjusted
    ? readMapZoom(mapBaseUrl) !== null
      ? updateMapZoom(mapBaseUrl, zoomLevel)
      : buildRooftopImageUrl({
          lat: rooftopData.lat,
          lng: rooftopData.lng,
          zoom: zoomLevel,
          area: manualAreaM2,
          address: rooftopData.formattedAddress,
        })
    : mapBaseUrl;

  const fetchGeocode = async (
    addrToSearch: string,
    coords?: { lat: number; lng: number },
    options?: { reverse?: boolean; updateAddress?: boolean }
  ): Promise<boolean | null> => {
    const requestId = ++geocodeRequestRef.current;
    stopInertia();
    setIsLoadingGeo(true);
    setLocationError(null);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addrToSearch,
          monthlyKwh,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          ...(options?.reverse ? { reverse: true } : {}),
        }),
      });
      const json = await res.json();
      if (requestId !== geocodeRequestRef.current) return null;

      if (json.success && json.data) {
        setFallbackWarning(
          json.data.locationResolved === false
            ? 'لم نعثر على العنوان بدقة. تم استخدام بيانات تجريبية للمعادي — عدّل مساحة السطح يدويًا أو اختر اقتراحًا من القائمة.'
            : null
        );
        setLocationError(null);
        if (options?.updateAddress && json.data.formattedAddress) {
          setAddress(String(json.data.formattedAddress));
        }
        setRooftopData(json.data);
        const detectedArea = Math.max(
          1,
          Math.round(
            json.data.roofAreaM2 || json.data.polygonAreaM2 || DEFAULT_AREA_M2
          )
        );
        const urlZoom = readMapZoom(json.data.staticMapUrl) ?? DEFAULT_ZOOM;
        const hasBuildingPolygon =
          Array.isArray(json.data.polygonCoords) &&
          json.data.polygonCoords.length >= 3;
        const nextZoom = chooseZoomForGeoPolygon(
          json.data.polygonCoords,
          json.data.lat,
          json.data.lng,
          17,
          urlZoom
        );
        const points = hasBuildingPolygon
          ? projectPolygonToViewBox(
              json.data.polygonCoords,
              json.data.lat,
              json.data.lng,
              nextZoom
            )
          : fitPolygonToArea(
              DEFAULT_ROOF_POLYGON,
              detectedArea,
              json.data.lat,
              nextZoom
            );
        const projectedArea = hasBuildingPolygon
          ? calculateMapPolygonAreaM2(points, json.data.lat, nextZoom)
          : detectedArea;
        const grossArea = projectedArea > 0 ? projectedArea : detectedArea;
        const apiUsableArea = Number(json.data.usableAreaM2);

        setManualAreaM2(grossArea);
        setDetectedUsableAreaM2(
          Number.isFinite(apiUsableArea) && apiUsableArea > 0
            ? Math.min(grossArea, apiUsableArea)
            : calculateUsableRoofArea(grossArea)
        );
        setIsAreaOverridden(false);
        setZoomLevel(nextZoom);
        setIsZoomAdjusted(nextZoom !== urlZoom);
        applyPolygon(points);
        applyPanOffset({ x: 0, y: 0 });
        setShowSurroundingTiles(false);
        setDraftRect(null);
        dragRef.current = null;
        setIsMapDragging(false);
        return true;
      }

      setFallbackWarning(
        'تعذر تحديد الموقع. يتم استخدام البيانات الحالية كبيانات تجريبية — يمكنك تعديل مساحة السطح يدويًا.'
      );
      return false;
    } catch {
      if (requestId !== geocodeRequestRef.current) return null;
      setFallbackWarning(
        'تعذر الاتصال بخدمة البحث. يتم استخدام البيانات الحالية كبيانات تجريبية.'
      );
      return false;
    } finally {
      if (requestId === geocodeRequestRef.current) {
        setIsLoadingGeo(false);
      }
    }
  };

  const cancelPendingSearch = () => {
    locateRequestRef.current += 1;
    geocodeRequestRef.current += 1;
    setIsLocating(false);
    setIsLoadingGeo(false);
  };

  const handleSuggestionSelect = (item: AddressSuggestion) => {
    cancelPendingSearch();
    setLocationNotice(null);
    const selectedAddress = item.query ?? item.label;
    setAddress(selectedAddress);
    setShowSuggestions(false);
    setHasEditedAddress(false);
    setSelectedSuggestionIndex(-1);
    setSuggestions([]);
    setSuggestionsNotice(null);
    fetchGeocode(
      selectedAddress,
      item.lat !== undefined && item.lng !== undefined
        ? { lat: item.lat, lng: item.lng }
        : undefined
    );
  };

  const runCurrentAddressSearch = () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    cancelPendingSearch();
    setLocationNotice(null);
    setShowSuggestions(false);
    setHasEditedAddress(false);
    setSelectedSuggestionIndex(-1);
    setSuggestions([]);
    setSuggestionsNotice(null);
    fetchGeocode(trimmed);
  };

  const useDemoFallback = () => {
    cancelPendingSearch();
    setLocationNotice(null);
    const demoAddress = 'المعادي، القاهرة';
    setAddress(demoAddress);
    setShowSuggestions(false);
    setHasEditedAddress(false);
    setSelectedSuggestionIndex(-1);
    setSuggestions([]);
    setSuggestionsNotice(null);
    fetchGeocode(demoAddress);
  };

  const fetchNetworkLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch('/api/live-location', { cache: 'no-store' });
      if (!res.ok) return null;

      const json = await res.json();
      const lat = Number(json?.data?.lat);
      const lng = Number(json?.data?.lng);
      if (
        json?.success &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { lat, lng };
      }
    } catch {
      return null;
    }
    return null;
  };

  const fetchSystemLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch('/api/system-location', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;

      const json = await res.json();
      const lat = Number(json?.data?.lat);
      const lng = Number(json?.data?.lng);
      if (
        json?.success &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { lat, lng };
      }
    } catch {
      return null;
    }
    return null;
  };

  const handleUseCurrentLocation = () => {
    if (isLocating) return;

    cancelPendingSearch();
    setShowSuggestions(false);
    setHasEditedAddress(false);
    setSelectedSuggestionIndex(-1);
    setSuggestions([]);
    setSuggestionsNotice(null);
    setFallbackWarning(null);
    setLocationError(null);
    setLocationNotice(null);

    const previousAddress = address;
    const locateId = ++locateRequestRef.current;
    setIsLocating(true);

    const isActive = () => locateId === locateRequestRef.current;

    const applyCoordinates = async (
      coords: { lat: number; lng: number },
      notice: string | null
    ) => {
      setAddress('جاري تحديد عنوان موقعك...');
      const resolved = await fetchGeocode('', coords, {
        reverse: true,
        updateAddress: true,
      });
      if (!isActive()) return;

      setIsLocating(false);
      if (resolved === false) {
        setAddress(previousAddress);
        setFallbackWarning(null);
        setLocationError(
          'تعذر تحميل بيانات موقعك الحالي. حاول مرة أخرى أو اكتب العنوان يدويًا.'
        );
        return;
      }

      setLocationNotice(notice);
    };

    const canUseSystemLocation =
      typeof window !== 'undefined' &&
      isPrivateHostname(window.location.hostname);
    let systemLocationAttempted = false;

    const trySystemLocation = async () => {
      if (!canUseSystemLocation || systemLocationAttempted) return null;
      systemLocationAttempted = true;
      return fetchSystemLocation();
    };

    const fallbackToNetworkLocation = async (
      failureMessage: string,
      approximateNotice: string
    ) => {
      if (!isActive()) return;

      const systemCoords = await trySystemLocation();
      if (!isActive()) return;

      if (systemCoords) {
        await applyCoordinates(systemCoords, null);
        return;
      }

      const networkCoords = await fetchNetworkLocation();
      if (!isActive()) return;

      if (networkCoords) {
        await applyCoordinates(networkCoords, approximateNotice);
        return;
      }

      setIsLocating(false);
      setAddress(previousAddress);
      setLocationError(failureMessage);
    };

    const startBrowserGeolocation = () => {
      if (
        typeof navigator === 'undefined' ||
        !('geolocation' in navigator) ||
        !navigator.geolocation
      ) {
        void fallbackToNetworkLocation(
          'متصفحك لا يدعم تحديد الموقع، وتعذر الحصول على تقدير تقريبي. اكتب العنوان يدويًا أو اختر موقعًا من الاقتراحات.',
          'متصفحك لا يدعم تحديد الموقع الدقيق، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. اكتب العنوان بالتفصيل أو عدّل موقع السطح على الخريطة.'
        );
        return;
      }

      if (typeof window === 'undefined' || !window.isSecureContext) {
        void fallbackToNetworkLocation(
          'تحديد الموقع الدقيق يتطلب اتصالًا آمنًا (HTTPS)، وتعذر الحصول على تقدير تقريبي. افتح التطبيق على localhost أو استخدم اتصالًا آمنًا.',
          'المتصفح لا يسمح بتحديد الموقع الدقيق على اتصال غير آمن (HTTP)، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. افتح التطبيق على localhost أو HTTPS ثم أعد المحاولة.'
        );
        return;
      }

      const onSuccess = (position: GeolocationPosition) => {
        if (!isActive()) return;
        const accuracyMeters = Number(position.coords.accuracy);
        void applyCoordinates(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          Number.isFinite(accuracyMeters) && accuracyMeters > 500
            ? `دقة الموقع منخفضة (حوالي ${Math.round(accuracyMeters / 1000)} كم)، لذلك قد لا يكون السطح على المبنى الصحيح. اضغط «إعادة المحاولة» أو عدّل الموقع على الخريطة.`
            : null
        );
      };

      const onError = (error: GeolocationPositionError) => {
        if (!isActive()) return;

        if (error.code === error.PERMISSION_DENIED) {
          void fallbackToNetworkLocation(
            'تم رفض إذن الوصول للموقع، وتعذر الحصول على تقدير تقريبي. اسمح بالموقع من إعدادات المتصفح ثم حاول مرة أخرى.',
            'تم رفض إذن الوصول للموقع، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. اسمح بالموقع من إعدادات المتصفح ثم اضغط «إعادة المحاولة».'
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (retryError) => {
            if (!isActive()) return;

            if (retryError.code === retryError.PERMISSION_DENIED) {
              void fallbackToNetworkLocation(
                'تم رفض إذن الوصول للموقع، وتعذر الحصول على تقدير تقريبي. اسمح بالموقع من إعدادات المتصفح ثم حاول مرة أخرى.',
                'تم رفض إذن الوصول للموقع، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. اسمح بالموقع من إعدادات المتصفح ثم اضغط «إعادة المحاولة».'
              );
            } else if (retryError.code === retryError.TIMEOUT) {
              void fallbackToNetworkLocation(
                'استغرق تحديد موقعك وقتًا طويلًا، وتعذر الحصول على تقدير تقريبي. حاول مرة أخرى أو اكتب العنوان يدويًا.',
                'استغرق تحديد موقعك وقتًا طويلًا، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. اضغط «إعادة المحاولة» للحصول على موقعك الدقيق.'
              );
            } else {
              void fallbackToNetworkLocation(
                'تعذر تحديد موقعك حاليًا، وتعذر الحصول على تقدير تقريبي. تأكد من تشغيل خدمات الموقع أو اكتب العنوان يدويًا.',
                'خدمات الموقع في نظام التشغيل متوقفة أو غير متاحة، لذلك استخدمنا تقديرًا تقريبيًا عبر الشبكة. فعّل الموقع من إعدادات ويندوز (الخصوصية والأمان ← الموقع) ثم اضغط «إعادة المحاولة» للحصول على موقعك الدقيق.'
              );
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
        );
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
    };

    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    if (isLoopbackHostname(hostname) && canUseSystemLocation) {
      void (async () => {
        const systemCoords = await trySystemLocation();
        if (!isActive()) return;

        if (systemCoords) {
          await applyCoordinates(systemCoords, null);
          return;
        }

        startBrowserGeolocation();
      })();
      return;
    }

    startBrowserGeolocation();
  };

  const changeManualArea = (delta: number) => {
    const nextArea = Math.max(30, Math.min(20000, manualAreaM2 + delta));
    if (nextArea === manualAreaM2) return;

    const scale = Math.sqrt(nextArea / Math.max(1, manualAreaM2));
    const scaled = scalePolygonAboutCentroid(roofPolygonRef.current, scale);
    applyPolygon(
      shiftPolygonIntoVisibleBounds(scaled, panOffsetRef.current)
    );
    setManualAreaM2(nextArea);
    setIsAreaOverridden(true);
  };

  const changeZoom = (delta: number) => {
    const nextZoom = clampRooftopZoom(zoomLevel + delta);
    if (nextZoom === zoomLevel) return;

    const scale = 2 ** (nextZoom - zoomLevel);
    stopInertia();
    const scaled = scalePolygonAboutCenter(roofPolygonRef.current, scale);
    applyPolygon(shiftPolygonIntoVisibleBounds(scaled, { x: 0, y: 0 }));
    applyPanOffset({ x: 0, y: 0 });
    setShowSurroundingTiles(false);
    setIsZoomAdjusted(true);
    setZoomLevel(nextZoom);
  };

  const handleProceed = () => {
    const roofAreaM2 = Math.round(manualAreaM2 * 100) / 100;
    const usable = Math.round(usableAreaM2 * 100) / 100;
    const areaUtilizationFactor =
      roofAreaM2 > 0
        ? Math.round((usable / roofAreaM2) * 1000) / 1000
        : DEFAULT_ROOF_UTILIZATION_FACTOR;

    onConfirm({
      ...rooftopData,
      formattedAddress: address,
      roofAreaM2,
      usableAreaM2: usable,
      areaUtilizationFactor,
      polygonAreaM2: roofAreaM2,
      meta: {
        ...rooftopData.meta,
        areaSource: isAreaOverridden
          ? 'manual'
          : (rooftopData.meta?.areaSource ?? 'manual'),
        usableAreaSource: isAreaOverridden
          ? 'utilization_factor'
          : (rooftopData.meta?.usableAreaSource ?? 'utilization_factor'),
      },
    });
  };

  return (
    <div className={cn('w-full flex flex-col space-y-4', className)}>
      {/* Step Progress Indicator */}
      <div className="w-full bg-surface-container-low rounded-xl p-3 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
        {/* Step 1 Done */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <AppIcon name="check" size={14} />
          </div>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">قراءة الفاتورة</span>
        </button>

        {/* Connector 1 */}
        <div className="h-0.5 flex-1 bg-primary min-w-[12px] mx-1 rounded-full"></div>

        {/* Step 2 Active */}
        <div className="flex items-center gap-1.5 shrink-0 bg-primary-container/15 px-2.5 py-1 rounded-full">
          <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
            <AppIcon name="my_location" size={14} />
          </div>
          <span className="font-label-sm text-label-sm text-primary font-bold">فحص السطح (الآن)</span>
        </div>

        {/* Connector 2 */}
        <div className="h-0.5 flex-1 bg-outline-variant min-w-[12px] mx-1 rounded-full"></div>

        {/* Step 3 Upcoming */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-50">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-label-sm text-label-sm font-bold">
            ٣
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">النتائج والتوفير</span>
        </div>
      </div>

      {/* Detected Bill Info Strip */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
            <AppIcon name="receipt_long" size={18} />
          </div>
          <div className="truncate">
            <p className="font-label-sm text-label-sm text-on-surface-variant">الفاتورة المكتشفة بالذكاء الاصطناعي</p>
            <p className="font-label-md text-label-md text-on-surface font-bold truncate">
              {monthlySpendEgp.toLocaleString('ar-EG')} ج.م / شهر{' '}
              <span className="font-label-sm text-label-sm text-tertiary font-normal">
                (شريحة تجارية أعلى من ١٠٠٠ ك.و)
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm shrink-0 flex items-center gap-1 active:bg-surface-container-highest transition-colors cursor-pointer"
        >
          <AppIcon name="edit" size={14} />
          <span>تعديل</span>
        </button>
      </div>

      {/* Address Selection Card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-bold flex items-center gap-1.5">
            <AppIcon name="storefront" className="text-primary" size={20} />
            <span>عنوان المحل أو الورشة</span>
          </label>
          <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            تحديد تلقائي
          </span>
        </div>

        {/* Input Box */}
        <div className="relative w-full">
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-12 shadow-inner">
            <AppIcon name="search" className="text-outline shrink-0 ml-2" size={20} />
            <input
              ref={addressInputRef}
              role="combobox"
              aria-autocomplete="list"
              aria-activedescendant={
                selectedSuggestionIndex >= 0
                  ? `address-option-${selectedSuggestionIndex}`
                  : undefined
              }
              aria-busy={isLoadingSuggestions || isLocating}
              aria-controls="address-suggestions-list"
              aria-expanded={showSuggestions}
              aria-label="البحث عن عنوان أو استخدام موقعك الحالي"
              autoComplete="off"
              dir="auto"
              enterKeyHint="search"
              spellCheck={false}
              className="bg-transparent border-0 outline-none w-full font-body-md text-body-md text-on-surface placeholder:text-outline font-medium"
              placeholder="ابحث باسم الشارع أو الحي..."
              type="text"
              value={address}
              onChange={(e) => {
                cancelPendingSearch();
                setAddress(e.target.value);
                setHasEditedAddress(true);
                setShowSuggestions(true);
                setSelectedSuggestionIndex(-1);
                setFallbackWarning(null);
                setLocationError(null);
                setLocationNotice(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 160);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setShowSuggestions(true);
                  if (suggestions.length === 0) return;
                  setSelectedSuggestionIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (suggestions.length === 0) return;
                  setSelectedSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                  );
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (
                    selectedSuggestionIndex >= 0 &&
                    suggestions[selectedSuggestionIndex]
                  ) {
                    handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
                  } else {
                    runCurrentAddressSearch();
                  }
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="استخدم موقعي الحالي"
              aria-label="استخدم موقعي الحالي"
              className={cn(
                'shrink-0 rounded-lg p-1.5 mr-1 transition-colors',
                isLocating
                  ? 'cursor-wait text-primary'
                  : 'cursor-pointer text-outline hover:bg-primary/10 hover:text-primary'
              )}
            >
              <AppIcon
                name={isLocating ? 'refresh' : 'my_location'}
                className={isLocating ? 'animate-spin' : undefined}
                size={17}
              />
            </button>
            {address && (
              <button
                type="button"
                onClick={() => {
                  cancelPendingSearch();
                  setAddress('');
                  setHasEditedAddress(true);
                  setShowSuggestions(true);
                  setFallbackWarning(null);
                  setLocationError(null);
                  setLocationNotice(null);
                  addressInputRef.current?.focus();
                }}
                aria-label="مسح البحث"
                title="مسح البحث"
                className="text-outline hover:text-on-surface p-1 mr-1 cursor-pointer"
              >
                <AppIcon name="close" size={16} />
              </button>
            )}
          </div>

          {showSuggestions && (
              <div
                id="address-suggestions-list"
                role="listbox"
                aria-busy={isLoadingSuggestions || isLocating}
                className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl"
              >
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex w-full items-center gap-2.5 border-b border-outline-variant/30 px-3 py-2.5 text-right transition-colors hover:bg-primary/5 disabled:cursor-wait"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <AppIcon
                      name={isLocating ? 'refresh' : 'my_location'}
                      className={isLocating ? 'animate-spin' : undefined}
                      size={16}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-label-md text-label-md font-semibold text-on-surface">
                      {isLocating ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
                    </span>
                    <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                      تحديد الموقع عبر GPS والمتصفح ثم قراءة العنوان تلقائيًا
                    </span>
                  </span>
                  {!isLocating && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-label-sm text-label-sm font-semibold text-primary">
                      GPS
                    </span>
                  )}
                </button>

                {isLoadingSuggestions ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-on-surface-variant font-label-sm text-label-sm">
                    <AppIcon name="refresh" className="animate-spin" size={16} />
                    <span>جاري البحث عن اقتراحات...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestionsNotice && (
                      <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                        <AppIcon name="warning" className="mt-0.5 text-amber-600" size={15} />
                        <span className="font-label-sm text-label-sm leading-relaxed">
                          {suggestionsNotice}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-3 py-2">
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">
                        اقتراحات المواقع
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Enter للاختيار
                      </span>
                    </div>
                    <ul className="max-h-64 overflow-y-auto">
                      {suggestions.map((item, index) => (
                        <li key={`${item.label}-${index}`}>
                          <button
                            type="button"
                            id={`address-option-${index}`}
                            role="option"
                            aria-selected={index === selectedSuggestionIndex}
                            onClick={() => handleSuggestionSelect(item)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2.5 text-right transition-colors cursor-pointer',
                              index === selectedSuggestionIndex
                                ? 'bg-primary/10'
                                : 'hover:bg-surface-container-low'
                            )}
                          >
                            <AppIcon
                              name={
                                item.category === 'industrial'
                                  ? 'storefront'
                                  : item.category === 'hub'
                                    ? 'explore'
                                    : 'my_location'
                              }
                              className="text-primary"
                              size={16}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">
                                {item.label}
                              </span>
                              {item.subLabel && (
                                <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
                                  {item.subLabel}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                              {item.category === 'industrial'
                                ? 'صناعي'
                                : item.category === 'hub'
                                  ? 'مجمع'
                                  : item.category === 'general'
                                    ? 'موقع'
                                    : 'تجاري'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={runCurrentAddressSearch}
                      className="w-full border-t border-outline-variant/30 px-3 py-2 text-right font-label-sm text-label-sm font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      متابعة بالعنوان الحالي
                    </button>
                  </>
                ) : suggestionsNotice ? (
                  <div className="space-y-2 p-3">
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-900">
                      <AppIcon name="warning" className="mt-0.5 text-amber-600" size={16} />
                      <p className="font-label-sm text-label-sm leading-relaxed">
                        {suggestionsNotice}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={runCurrentAddressSearch}
                        className="rounded-lg bg-surface-container px-2 py-2 font-label-sm text-label-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        متابعة بالعنوان
                      </button>
                      <button
                        type="button"
                        onClick={useDemoFallback}
                        className="rounded-lg bg-primary/10 px-2 py-2 font-label-sm text-label-sm font-semibold text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                      >
                        استخدام المعادي التجريبي
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-3 py-3 text-on-surface-variant">
                    <AppIcon name="search" className="mt-0.5 text-outline" size={15} />
                    <p className="font-label-sm text-label-sm leading-relaxed">
                      اكتب حرفين على الأقل لعرض الاقتراحات، أو استخدم موقعك الحالي.
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-0.5 pb-1">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 bg-secondary-fixed text-on-secondary-fixed rounded-full font-label-sm text-label-sm font-semibold shrink-0 shadow-sm transition-all',
              isLocating
                ? 'cursor-wait opacity-80'
                : 'cursor-pointer active:scale-95'
            )}
          >
            <AppIcon
              name={isLocating ? 'refresh' : 'near_me'}
              className={isLocating ? 'animate-spin' : undefined}
              size={16}
            />
            <span>
              {isLocating ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              cancelPendingSearch();
              const addr = 'ورشة الدقي المركزية، الجيزة';
              setShowSuggestions(false);
              setLocationNotice(null);
              setHasEditedAddress(false);
              setSelectedSuggestionIndex(-1);
              setSuggestions([]);
              setSuggestionsNotice(null);
              setAddress(addr);
              fetchGeocode(addr);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm shrink-0 active:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <AppIcon name="history" size={15} />
            <span>ورشة الدقي المركزية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              cancelPendingSearch();
              const addr = 'المعادي، القاهرة';
              setShowSuggestions(false);
              setLocationNotice(null);
              setHasEditedAddress(false);
              setSelectedSuggestionIndex(-1);
              setSuggestions([]);
              setSuggestionsNotice(null);
              setAddress(addr);
              fetchGeocode(addr);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm shrink-0 active:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <AppIcon name="history" size={15} />
            <span>المعادي، القاهرة</span>
          </button>
        </div>

        {/* Business Name Input */}
        <div className="flex flex-col gap-1 pt-1">
          <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            اسم المنشأة التجارية <span className="text-outline">(اختياري)</span>
          </label>
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-10 shadow-inner">
            <AppIcon name="store" className="text-outline shrink-0 ml-2" size={18} />
            <input
              className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline"
              placeholder="مثال: مخبز البركة، ورشة المعادي..."
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
        </div>

        {locationError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-error/30 bg-error-container/40 p-3 text-on-error-container"
          >
            <AppIcon name="warning" className="mt-0.5 text-error" size={18} />
            <p className="min-w-0 flex-1 font-label-sm text-label-sm leading-relaxed">
              {locationError}
            </p>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              aria-label="إغلاق تنبيه الموقع"
              className="p-0.5 text-on-error-container/70 hover:text-on-error-container transition-colors cursor-pointer"
            >
              <AppIcon name="close" size={14} />
            </button>
          </div>
        )}

        {locationNotice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-on-surface"
          >
            <AppIcon name="near_me" className="mt-0.5 text-primary" size={18} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-label-sm text-label-sm leading-relaxed">
                {locationNotice}
              </p>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-wait"
              >
                <AppIcon name="refresh" size={13} />
                <span>إعادة المحاولة</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLocationNotice(null)}
              aria-label="إغلاق ملاحظة الموقع"
              className="p-0.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <AppIcon name="close" size={14} />
            </button>
          </div>
        )}

        {fallbackWarning && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900"
          >
            <AppIcon name="warning" className="mt-0.5 text-amber-600" size={18} />
            <div className="min-w-0 flex-1">
              <p className="font-label-sm text-label-sm font-bold">
                تحذير: بيانات الموقع تجريبية
              </p>
              <p className="font-label-sm text-label-sm leading-relaxed">
                {fallbackWarning}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFallbackWarning(null)}
              aria-label="إغلاق التحذير"
              className="p-0.5 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
            >
              <AppIcon name="close" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Satellite Rooftop Map Card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-3.5 shadow-md flex flex-col space-y-3">
        {/* Header of Map */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-ping"></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">المسح بالأقمار الصناعية</h3>
          </div>
          <div className="bg-surface-container px-2.5 py-1 rounded-full flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <AppIcon name="satellite_alt" size={14} />
            <span>{isLoadingGeo ? 'جاري التحديث...' : 'دقة عالية 0.3م'}</span>
          </div>
        </div>

        {/* Map Viewport Container */}
        <div
          ref={mapViewportRef}
          className="relative w-full h-64 rounded-xl overflow-hidden shadow-inner bg-surface-dim"
        >
          {/* Blurred backdrop keeps edges filled while panning */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center scale-110 blur-[2px] opacity-70"
            style={{ backgroundImage: `url('${mapImageUrl}')` }}
          />

          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${
                (panOffset.x / MAP_VIEWBOX_WIDTH) * 100
              }%, ${(panOffset.y / MAP_VIEWBOX_HEIGHT) * 100}%)`,
            }}
          >
            {/* Surrounding satellite tiles keep the map filled while panning */}
            {surroundingTiles.map((tile) => (
              <div
                key={tile.key}
                aria-hidden="true"
                className="absolute"
                style={{
                  left: `${tile.left}%`,
                  top: `${tile.top}%`,
                  width: 'calc(100% + 1px)',
                  height: 'calc(100% + 1px)',
                  backgroundImage: `url('${tile.url}')`,
                  backgroundPosition: 'center',
                  backgroundSize: '100% 100%',
                }}
              />
            ))}

            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage: `url('${mapImageUrl}')`,
                backgroundPosition: 'center',
                backgroundSize: '100% 100%',
              }}
            ></div>
          </div>

          {/* Rooftop Solar Polygon Layer (Vector Overlay SVG)
              Kept outside the panned imagery layer so its viewport always
              covers the whole card and never clips the selection mid-map. */}
          <svg
            className={cn(
              'absolute inset-0 w-full h-full touch-none select-none',
              mapTool === 'pan'
                ? isMapDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-crosshair'
            )}
            preserveAspectRatio="none"
            viewBox={`0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={finishMapDrag}
            onPointerCancel={cancelMapDrag}
            onPointerEnter={() => setShowSurroundingTiles(true)}
            onDoubleClick={() => {
              cancelMapDrag();
              applyPanOffset({ x: 0, y: 0 });
            }}
          >
          <defs>
            <linearGradient id="solarGlow" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#fdc73a" stopOpacity="0.55"></stop>
              <stop offset="100%" stopColor="#ffb68d" stopOpacity="0.30"></stop>
            </linearGradient>
            <filter height="120%" id="shadowGlow" width="120%" x="-10%" y="-10%">
              <feDropShadow dx="0" dy="2" floodColor="#b55300" floodOpacity="0.4" stdDeviation="4"></feDropShadow>
            </filter>
            <clipPath id="roofSelectionClip">
              <polygon points={selectionPointsAttr} />
            </clipPath>
          </defs>

          {/* Highlighted Detection Polygon (draggable) */}
          <polygon
            data-polygon="roof"
            fill="url(#solarGlow)"
            filter="url(#shadowGlow)"
            points={selectionPointsAttr}
            stroke="#fdc73a"
            strokeDasharray="6 3"
            strokeWidth="3"
            style={{ cursor: mapTool === 'pan' ? 'move' : 'crosshair' }}
          ></polygon>

          {/* Selection grid: anchored to the live vertices, clipped to the shape */}
          <g
            aria-hidden="true"
            clipPath="url(#roofSelectionClip)"
            pointerEvents="none"
          >
            {verticalGridSegments.map((segment) => (
              <line
                key={segment.key}
                stroke="#ffffff"
                strokeDasharray="5 4"
                strokeOpacity="0.45"
                strokeWidth="1.25"
                x1={segment.x1 + panOffset.x}
                x2={segment.x2 + panOffset.x}
                y1={segment.y1 + panOffset.y}
                y2={segment.y2 + panOffset.y}
              />
            ))}
            {horizontalGridSegments.map((segment) => (
              <line
                key={segment.key}
                stroke="#ffffff"
                strokeDasharray="5 4"
                strokeOpacity="0.45"
                strokeWidth="1.25"
                x1={segment.x1 + panOffset.x}
                x2={segment.x2 + panOffset.x}
                y1={segment.y1 + panOffset.y}
                y2={segment.y2 + panOffset.y}
              />
            ))}
          </g>

          {/* Live drag-to-select preview */}
          {draftRect && (
            <rect
              fill="#fdc73a"
              fillOpacity="0.18"
              height={draftRect.height}
              stroke="#fdc73a"
              strokeDasharray="6 3"
              strokeWidth="2"
              width={draftRect.width}
              x={draftRect.x + panOffset.x}
              y={draftRect.y + panOffset.y}
            ></rect>
          )}

          {/* Draggable Vertex Grab Handles */}
          {roofPolygon.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x + panOffset.x}
                cy={point.y + panOffset.y}
                data-vertex={index}
                fill="transparent"
                pointerEvents="all"
                r="12"
                style={{ cursor: 'grab' }}
              ></circle>
              <circle
                cx={point.x + panOffset.x}
                cy={point.y + panOffset.y}
                fill="#006161"
                pointerEvents="none"
                r="5"
                stroke="#ffffff"
                strokeWidth="2"
              ></circle>
            </g>
          ))}

          {/* Compass & Sun Angle Indicator (bottom right, clear of the HUD pills) */}
          <g transform="translate(370, 270)">
            <circle cx="0" cy="0" fill="#1e1b14" fillOpacity="0.75" r="18"></circle>
            <line stroke="#fdc73a" strokeLinecap="round" strokeWidth="2.5" x1="0" x2="0" y1="0" y2="12"></line>
            <polygon fill="#fdc73a" points="0,15 -3,10 3,10"></polygon>
            <text fill="#ffffff" fontFamily="Inter" fontSize="8" fontWeight="bold" textAnchor="middle" x="0" y="-7">
              N
            </text>
          </g>
          </svg>

          {/* Interactive Micro Pill in Map */}
          <div className="absolute top-3 left-3 pointer-events-none bg-inverse-surface/85 backdrop-blur-md text-inverse-on-surface px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1.5 shadow-md">
            <AppIcon name="wb_sunny" className="text-secondary-fixed" size={14} />
            <span>إشعاع شمسي ٥.٦ ك.و.س/م²</span>
          </div>

          {/* Pulse indicator on Rooftop Center */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
            style={{
              left: `${
                ((polygonCenter.x + panOffset.x) / MAP_VIEWBOX_WIDTH) * 100
              }%`,
              top: `${
                ((polygonCenter.y + panOffset.y) / MAP_VIEWBOX_HEIGHT) * 100
              }%`,
            }}
          >
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary-container"></span>
            </span>
            <span className="mt-1 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-on-surface font-label-sm text-label-sm font-bold">
              سطح المنشأة المستهدف
            </span>
          </div>

          {/* Map Tool Toggle Overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                cancelMapDrag();
                setMapTool('pan');
              }}
              aria-label="سحب وتحريك الخريطة"
              aria-pressed={mapTool === 'pan'}
              className={cn(
                'w-8 h-8 rounded-lg shadow flex items-center justify-center cursor-pointer transition-colors',
                mapTool === 'pan'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface active:bg-surface-container'
              )}
              title="سحب وتحريك الخريطة"
            >
              <AppIcon name="near_me" size={17} />
            </button>
            <button
              type="button"
              onClick={() => {
                cancelMapDrag();
                setMapTool('draw');
              }}
              aria-label="رسم مستطيل السطح"
              aria-pressed={mapTool === 'draw'}
              className={cn(
                'w-8 h-8 rounded-lg shadow flex items-center justify-center cursor-pointer transition-colors',
                mapTool === 'draw'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface active:bg-surface-container'
              )}
              title="رسم مستطيل السطح"
            >
              <AppIcon name="edit" size={17} />
            </button>
            {(panOffset.x !== 0 || panOffset.y !== 0) && (
              <button
                type="button"
                onClick={() => {
                  cancelMapDrag();
                  applyPanOffset({ x: 0, y: 0 });
                }}
                aria-label="إعادة التمركز على المبنى"
                className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-primary cursor-pointer"
                title="إعادة التمركز على المبنى"
              >
                <AppIcon name="my_location" size={17} />
              </button>
            )}
          </div>

          {/* Quick Zoom Controls Overlay */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => changeZoom(1)}
              className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
              title="تكبير"
            >
              <AppIcon name="add" size={18} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
              title="تصغير"
            >
              <AppIcon name="remove" size={18} />
            </button>
          </div>

        </div>

        {/* Map gesture hint, kept outside the viewport so it never covers the selection */}
        <div className="-mt-1 flex items-center justify-end gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
          <AppIcon name={mapTool === 'pan' ? 'near_me' : 'edit'} size={13} />
          <span>
            {mapTool === 'pan'
              ? 'اسحب الخريطة أو السطح لتحريكه'
              : 'اسحب لرسم مستطيل السطح'}
          </span>
        </div>

        {/* Rooftop Metrics Summary Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Metric 1: Usable Area */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="square_foot" className="text-primary" size={15} />
              <span>المساحة</span>
            </div>
            <div className="mt-1">
              <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-primary font-bold">
                {usableAreaM2.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">م²</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-semibold mt-0.5">
              صافي {roofUtilizationPercent.toLocaleString('ar-EG')}٪ من {manualAreaM2.toLocaleString('ar-EG')} م²
            </span>
          </div>

          {/* Metric 2: Estimated Power */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="bolt" className="text-tertiary" size={15} />
              <span>القدرة</span>
            </div>
            <div className="mt-1">
              <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-tertiary font-bold">
                {capacityKw.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">ك.واط</span>
            </div>
            <span className="font-label-sm text-label-sm text-tertiary font-semibold mt-0.5">نظام استيعابي</span>
          </div>

          {/* Metric 3: Sun Angle */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="explore" className="text-secondary" size={15} />
              <span>التوجيه</span>
            </div>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">ممتاز</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">جنوبي بزاوية ٢٨°</span>
          </div>
        </div>

        {/* Manual Area Stepper Adjustment Card */}
        <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon name="tune" className="text-primary" size={20} />
            <div>
              <p className="font-label-md text-label-md text-on-surface font-semibold">المساحة غير دقيقة على الخريطة؟</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">عدّل مساحة السطح الإجمالية يدويًا</p>
            </div>
          </div>

          {/* Interactive Stepper */}
          <div className="flex items-center bg-surface-container-lowest rounded-full p-1 shadow-sm">
            <button
              aria-label="تقليل المساحة"
              type="button"
              onClick={() => changeManualArea(-10)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
            >
              -
            </button>
            <div className="px-2.5 text-center min-w-[54px]">
              <span className="font-label-lg text-label-lg font-bold text-primary">
                {manualAreaM2.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">م²</span>
            </div>
            <button
              aria-label="زيادة المساحة"
              type="button"
              onClick={() => changeManualArea(10)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Estimated Payback Teaser Card */}
      <div className="w-full bg-secondary-fixed/35 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
            <AppIcon name="savings" size={22} />
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-secondary font-semibold">التوفير السنوي المتوقع الأولي</p>
            <p className="font-headline-sm text-headline-sm text-on-surface font-bold">
              <span>{teaserSavings.toLocaleString('ar-EG')}</span> ج.م{' '}
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">/ سنة</span>
            </p>
          </div>
        </div>
        <div className="text-left">
          <span className="bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold px-2.5 py-1 rounded-full shadow-sm">
            فترة استرداد ≈ {paybackYears.toLocaleString('ar-EG')} سنة
          </span>
        </div>
      </div>

      {/* Primary Sticky Bottom Action Area */}
      <div className="w-full pt-2 flex flex-col space-y-2">
        <button
          type="button"
          onClick={handleProceed}
          disabled={!address.trim()}
          className={cn(
            'w-full h-14 rounded-2xl font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer',
            address.trim()
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-highest text-outline cursor-not-allowed opacity-60'
          )}
        >
          <AppIcon name="wb_sunny" size={24} />
          <span>احسب التوفير وافتح لوحة التحكم</span>
          <AppIcon name="arrow_back" size={20} className="mr-1" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-center text-outline font-label-sm text-label-sm py-1">
          <AppIcon name="verified_user" className="text-primary" size={16} />
          <span>البيانات مؤمنة ومحسوبة بالتعريفة المصرية المعتمدة لعام ٢٠٢٤</span>
        </div>
      </div>
    </div>
  );
}
