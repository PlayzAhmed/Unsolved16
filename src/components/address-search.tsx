"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Search,
  Loader2,
  Building2,
  Factory,
  Compass,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressSearchProps {
  initialValue?: string;
  onSelectAddress: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

interface Suggestion {
  label: string;
  subLabel?: string;
  lat?: number;
  lng?: number;
  category: "industrial" | "commercial" | "hub" | "general";
}

export function AddressSearch({
  initialValue = "المعادي، القاهرة",
  onSelectAddress,
  placeholder = "اكتب عنوان المحل",
  className,
  autoFocus = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [previousInitialValue, setPreviousInitialValue] = useState(initialValue);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if initialValue changes externally
  if (initialValue !== previousInitialValue) {
    setPreviousInitialValue(initialValue);
    setQuery(initialValue);
  }

  // Measure the input position whenever the dropdown opens or window resizes
  const measureInput = useCallback(() => {
    if (containerRef.current) {
      setDropdownRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      measureInput();
      window.addEventListener("resize", measureInput);
      window.addEventListener("scroll", measureInput, true);
    }
    return () => {
      window.removeEventListener("resize", measureInput);
      window.removeEventListener("scroll", measureInput, true);
    };
  }, [isOpen, measureInput]);

  // Click outside listener to dismiss suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const portalDropdown = document.querySelector("[data-address-dropdown]");
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(portalDropdown && portalDropdown.contains(target))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/address-suggestions?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSuggestions(json.data);
        }
      } catch {
        // Keep existing suggestions if any error
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (item: Suggestion) => {
    setQuery(item.label);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelectAddress(item.label, item.lat, item.lng);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (query.trim().length > 0) {
        setIsOpen(false);
        onSelectAddress(query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (cat: Suggestion["category"]) => {
    switch (cat) {
      case "industrial":
        return <Factory className="w-3.5 h-3.5 text-sunset shrink-0" />;
      case "hub":
        return <Compass className="w-3.5 h-3.5 text-teal shrink-0" />;
      case "commercial":
      default:
        return <Building2 className="w-3.5 h-3.5 text-teal shrink-0" />;
    }
  };

  const getCategoryBadge = (cat: Suggestion["category"]) => {
    switch (cat) {
      case "industrial":
        return "bg-sunset/15 text-sunset border-sunset/30";
      case "hub":
        return "bg-teal/15 text-teal border-teal/30";
      case "commercial":
      default:
        return "bg-teal/10 text-teal border-teal/20";
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full ps-10 pe-24 py-3 bg-sand/40 border border-teal/30 rounded-xl text-ink placeholder-teal-deep/50 text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all shadow-inner"
        />

        <Search className="w-4 h-4 text-teal absolute start-3.5 pointer-events-none" />

        <div className="absolute end-2.5 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-teal animate-spin me-1" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="مسح البحث"
              className="p-1 text-teal-deep/50 hover:text-teal-deep transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (query.trim().length > 0) {
                setIsOpen(false);
                onSelectAddress(query.trim());
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-teal hover:bg-teal/90 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            <span>فحص السطح</span>
          </button>
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown via Portal */}
      {isMounted &&
        isOpen &&
        suggestions.length > 0 &&
        dropdownRect &&
        createPortal(
          <div
            data-address-dropdown
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 8,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="bg-white border border-teal/20 rounded-xl shadow-lift backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="p-2.5 border-b border-teal/10 flex items-center justify-between text-xs text-teal-deep/70 bg-sand/40">
              <span className="font-bold flex items-center gap-1.5 text-teal-deep">
                <Sparkles className="w-3.5 h-3.5 text-sunset" />
                اقتراحات المناطق والمدن الصناعية والتجارية
              </span>
              <span className="text-[10px] text-teal-deep/60">اضغط Enter للاختيار</span>
            </div>

            <ul className="max-h-64 overflow-y-auto divide-y divide-teal/10 text-xs">
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li key={`${item.label}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full text-right p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer",
                        isSelected
                          ? "bg-teal/10 text-teal-deep font-bold"
                          : "hover:bg-sand/60 text-ink"
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-sand border border-teal/20 shrink-0 mt-0.5">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="font-bold text-teal-deep truncate flex items-center gap-1.5">
                            <span>{item.label}</span>
                          </div>
                          {item.subLabel && (
                            <div className="text-[11px] text-teal-deep/60 truncate mt-0.5">
                              {item.subLabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            getCategoryBadge(item.category)
                          )}
                        >
                          {item.category === "industrial"
                            ? "صناعي"
                            : item.category === "hub"
                            ? "مجمع"
                            : "تجاري"}
                        </span>
                        <span className="text-[10px] text-teal font-semibold hidden sm:inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-teal" />
                          جاهز للـ GIS
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
