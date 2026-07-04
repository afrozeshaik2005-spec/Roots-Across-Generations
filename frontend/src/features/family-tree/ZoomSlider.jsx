import { Crosshair } from 'lucide-react';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2.5;

const ZoomSlider = ({ zoom, onZoomChange, onResetView }) => {
  const sliderPercent = ((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
      {/* Reset button */}
      <button
        onClick={onResetView}
        className="p-1.5 bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 transition duration-200 mb-1"
        title="Recenter Tree"
      >
        <Crosshair className="w-3.5 h-3.5 text-neutral-500" />
      </button>

      {/* Zoom label */}
      <span className="text-[10px] font-mono text-neutral-500 bg-white/80 px-1.5 py-0.5 rounded">
        {Math.round(zoom * 100)}%
      </span>

      {/* Vertical slider */}
      <div className="relative h-40 flex items-center">
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="h-40 w-5 cursor-pointer opacity-0 absolute"
          orient="vertical"
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl'
          }}
        />
        {/* Visual track */}
        <div className="w-1.5 h-40 bg-neutral-200 rounded-full relative pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full bg-ancestral-500 rounded-full transition-all duration-75"
            style={{ height: `${sliderPercent}%` }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-ancestral-500 rounded-full shadow-sm transition-all duration-75"
            style={{ bottom: `calc(${sliderPercent}% - 7px)` }}
          />
        </div>
      </div>

      {/* Labels */}
      <div className="flex flex-col items-center gap-0.5 mt-1">
        <span className="text-[8px] text-neutral-400 font-light">Detail</span>
        <span className="text-[8px] text-neutral-400 font-light">Normal</span>
        <span className="text-[8px] text-neutral-400 font-light">Overview</span>
      </div>
    </div>
  );
};

export default ZoomSlider;
