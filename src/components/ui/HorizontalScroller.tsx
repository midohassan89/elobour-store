"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

type HorizontalScrollerProps = {
  children: ReactNode;
  className?: string;
};

const arrowClassName =
  "absolute top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function HorizontalScroller({ children, className = "" }: HorizontalScrollerProps) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const scrollSign = useRef(0);
  const [expanded, setExpanded] = useState(false);

  function scrollSignFor(scroller: HTMLDivElement) {
    if (scrollSign.current !== 0) {
      return scrollSign.current;
    }

    const sample = scroller.firstElementChild;
    if (!(sample instanceof HTMLElement)) {
      return 1;
    }

    const previous = scroller.scrollLeft;
    const before = sample.getBoundingClientRect().left;
    scroller.scrollLeft = previous + 24;
    let moved = sample.getBoundingClientRect().left - before;
    if (moved === 0) {
      scroller.scrollLeft = previous - 24;
      moved = sample.getBoundingClientRect().left - before;
      scroller.scrollLeft = previous;
      scrollSign.current = moved > 0 ? -1 : 1;
      return scrollSign.current;
    }

    scroller.scrollLeft = previous;
    scrollSign.current = moved < 0 ? 1 : -1;
    return scrollSign.current;
  }

  function scrollBySide(side: "left" | "right") {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const visualDelta = side === "right" ? 300 : -300;
    scroller.scrollBy({ left: visualDelta * scrollSignFor(scroller), behavior: "smooth" });
  }

  function onMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (expanded || event.button !== 0) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    drag.current = {
      active: true,
      startX: event.pageX,
      scrollLeft: scroller.scrollLeft,
      moved: false,
    };
  }

  function onMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.active) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    event.preventDefault();
    const delta = event.pageX - drag.current.startX;
    if (Math.abs(delta) > 4) {
      drag.current.moved = true;
    }
    scroller.scrollLeft = drag.current.scrollLeft - delta;
  }

  function endDrag() {
    drag.current.active = false;
    window.setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <div className="relative min-w-0 flex-1">
        {expanded ? null : (
          <>
            <button
              type="button"
              aria-label={t("scrollPrevious")}
              onClick={() => scrollBySide("left")}
              className={`${arrowClassName} left-1`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={t("scrollNext")}
              onClick={() => scrollBySide("right")}
              className={`${arrowClassName} right-1`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div
          ref={scrollerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(event) => event.preventDefault()}
          className={
            expanded
              ? "flex flex-wrap gap-2 px-1 py-1"
              : "flex cursor-grab gap-2 overflow-x-auto px-11 py-1 select-none active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mt-1 shrink-0 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-extrabold text-primary transition hover:border-primary dark:border-gray-700 dark:bg-gray-900"
      >
        {expanded ? t("collapseStrip") : t("showAllStrip")}
      </button>
    </div>
  );
}
