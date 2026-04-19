import { useDraggable } from "./useDraggable";
import { useCollapsible, CollapseButton } from "./useCollapsible";
import { useAppStore } from "../data/store";

interface Group {
  id: string;
  label: string;
  color: string;
  lineIds: string[];
}

function modeLabel(mode?: string) {
  if (mode === "bus") return "Buss";
  if (mode === "rail") return "Tåg";
  if (mode === "tram") return "Spårvagn";
  if (mode === "ferry") return "Båt";
  if (mode === "lightrail") return "Lokalbana";
  if (mode === "subway") return "Tunnelbana";
  return "Linje";
}

export function Legend() {
  const drag = useDraggable({ storageKey: "legend", defaultAnchor: { right: 20, bottom: 20 } });
  const { collapsed, toggle } = useCollapsible("legend");
  const network = useAppStore((s) => s.network);
  const hidden = useAppStore((s) => s.hiddenLineIds);
  const toggleLineGroup = useAppStore((s) => s.toggleLineGroup);

  const groups: Group[] = (network?.lines ?? []).map((line) => ({
    id: line.id,
    label: `${modeLabel(line.mode)} ${line.id}${line.name ? ` - ${line.name}` : ""}`,
    color: line.color,
    lineIds: [line.id],
  }));

  return (
    <div ref={drag.ref as any} className="legend panel" style={drag.style} {...drag.handlers}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h4 style={{ flex: 1, margin: 0 }}>Teckenförklaring</h4>
        <CollapseButton collapsed={collapsed} onToggle={toggle} size={22} />
      </div>
      {!collapsed && <div style={{ height: 10 }} />}
      {!collapsed && groups.map((g) => {
        const isOn = !g.lineIds.every((id) => hidden.has(id));
        return (
          <button
            key={g.id}
            onClick={() => toggleLineGroup(g.lineIds)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 4px",
              width: "100%",
              background: "transparent",
              border: "none",
              color: isOn ? "var(--ink)" : "#5a697f",
              cursor: "pointer",
              fontSize: 12,
              textAlign: "left",
              fontFamily: "inherit",
              borderRadius: 4,
              transition: "color 0.15s",
            }}
          >
            <Toggle on={isOn} color={g.color} />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: isOn ? g.color : `${g.color}40`,
                boxShadow: isOn ? `0 0 6px ${g.color}` : "none",
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{g.label}</span>
          </button>
        );
      })}
      {!collapsed && (
        <>
          <div style={{ height: 10 }} />
          <div className="legend-row"><span className="swatch" style={{ background: "#ffffff", color: "#ffffff" }} />I tid</div>
          <div className="legend-row"><span className="swatch" style={{ background: "#ffc04a", color: "#ffc04a" }} />Försenat</div>
          <div className="legend-row"><span className="swatch" style={{ background: "#ff3030", color: "#ff3030" }} />Stillastående</div>
          <div style={{ height: 10 }} />
          <div style={{ fontSize: 10.5, color: "#8b98ad", lineHeight: 1.4 }}>
            Klicka i listan för att visa eller dölja linjer. Bussnätet visas i marknivå.
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      style={{
        width: 26,
        height: 14,
        borderRadius: 7,
        background: on ? color : "rgba(255,255,255,0.14)",
        position: "relative",
        transition: "background 0.18s",
        flexShrink: 0,
        boxShadow: on ? `0 0 8px ${color}70` : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 14 : 2,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      />
    </span>
  );
}
