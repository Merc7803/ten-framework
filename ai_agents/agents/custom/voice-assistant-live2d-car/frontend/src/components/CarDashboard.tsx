"use client";

import {
  Car,
  Fan,
  Gauge,
  Lightbulb,
  Lock,
  MapPin,
  Music,
  Snowflake,
  Thermometer,
  Unlock,
  Volume2,
} from "lucide-react";

type CarState = {
  climate: {
    ac: boolean;
    temperature: number;
    fan: number;
  };
  media: {
    volume: number;
    playing: boolean;
  };
  navigation: {
    destination: string;
  };
  lights: {
    headlights: boolean;
    cabin: boolean;
  };
  locks: {
    doorsLocked: boolean;
  };
  windows: {
    driver: number;
    passenger: number;
  };
};

interface CarDashboardProps {
  state: CarState;
  assistantState: "awake" | "sleeping";
}

function StatusPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 font-medium text-[11px]",
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate font-semibold text-slate-950 text-sm">
        {value}
      </div>
    </div>
  );
}

export default function CarDashboard({
  state,
  assistantState,
}: CarDashboardProps) {
  const isAwake = assistantState === "awake";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-white">
      <div className="flex shrink-0 items-center justify-between border-slate-800 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-cyan-400 text-slate-950">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Marmot EV Cockpit</h2>
            <p className="text-slate-400 text-xs">Voice control demo</p>
          </div>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 font-medium text-xs",
            isAwake
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-amber-400/15 text-amber-300",
          ].join(" ")}
        >
          {isAwake ? "Awake" : "Say hey marmot"}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 overflow-hidden p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 p-4 text-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide">
                  Speed
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="font-bold text-5xl leading-none">0</span>
                  <span className="pb-1 font-semibold text-sm">km/h</span>
                </div>
              </div>
              <Gauge className="h-12 w-12 opacity-70" />
            </div>
          </div>

          <div className="rounded-md bg-slate-900 p-4">
            <div className="text-slate-400 text-xs">Battery</div>
            <div className="mt-2 font-bold text-3xl">82%</div>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-full w-[82%] rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-2 gap-3 overflow-hidden">
          <div className="rounded-md bg-white p-3 text-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Snowflake className="h-4 w-4 text-cyan-600" />
                Climate
              </div>
              <StatusPill active={state.climate.ac} label="AC" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric
                icon={<Thermometer className="h-3.5 w-3.5" />}
                label="Temp"
                value={`${state.climate.temperature}C`}
              />
              <MiniMetric
                icon={<Fan className="h-3.5 w-3.5" />}
                label="Fan"
                value={`${state.climate.fan}/5`}
              />
            </div>
          </div>

          <div className="rounded-md bg-white p-3 text-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Lock className="h-4 w-4 text-blue-600" />
                Security
              </div>
              {state.locks.doorsLocked ? (
                <StatusPill active label="Locked" />
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-[11px]">
                  <Unlock className="h-3 w-3" />
                  Open
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                label="Head"
                value={state.lights.headlights ? "On" : "Off"}
              />
              <MiniMetric
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                label="Cabin"
                value={state.lights.cabin ? "On" : "Off"}
              />
            </div>
          </div>

          <div className="rounded-md bg-white p-3 text-slate-950">
            <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <Music className="h-4 w-4 text-fuchsia-600" />
              Media
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric
                icon={<Volume2 className="h-3.5 w-3.5" />}
                label="Volume"
                value={`${state.media.volume}%`}
              />
              <MiniMetric
                icon={<Music className="h-3.5 w-3.5" />}
                label="Audio"
                value={state.media.playing ? "Playing" : "Paused"}
              />
            </div>
          </div>

          <div className="rounded-md bg-white p-3 text-slate-950">
            <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
              <MapPin className="h-4 w-4 text-rose-600" />
              Navigation
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="text-slate-500 text-[11px]">Destination</div>
              <div className="mt-1 truncate font-semibold text-sm">
                {state.navigation.destination || "Not set"}
              </div>
            </div>
          </div>

          <div className="col-span-2 rounded-md bg-white p-3 text-slate-950">
            <div className="mb-2 font-semibold text-sm">Windows</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Driver", state.windows.driver],
                ["Passenger", state.windows.passenger],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
