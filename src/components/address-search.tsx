"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  placeholder = "e.g. المعادي، القاهرة or المنطقة الصناعية، العاشر من رمضان",
  className,
  autoFocus = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track mount state for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync internal state if initialValue changes externally
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

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
      // Check container and also the portal dropdown (by data attribute)
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
        return <Factory className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "hub":
        return <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case "commercial":
      default:
        return <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  const getCategoryBadge = (cat: Suggestion["category"]) => {
    switch (cat) {
      case "industrial":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "hub":
        return "bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "commercial":
      default:
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
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
          className="w-full pl-10 pr-20 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
        />

        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin mr-1" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="Clear search"
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
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
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown — rendered via portal to escape stacking context */}
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
            className="bg-slate-900/98 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="p-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold flex items-center gap-1 text-slate-300">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Suggested Egyptian Commercial &amp; Industrial Locations
              </span>
              <span className="text-[10px] text-slate-500">Press Enter to select</span>
            </div>

            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 text-xs">
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li key={`${item.label}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full text-left p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer",
                        isSelected
                          ? "bg-emerald-500/15 text-white"
                          : "hover:bg-slate-800/70 text-slate-200"
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 shrink-0 mt-0.5">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                            <span>{item.label}</span>
                          </div>
                          {item.subLabel && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subLabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            getCategoryBadge(item.category)
                          )}
                        >
                          {item.category}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          GIS Ready
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
