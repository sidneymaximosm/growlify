import React from "react";

export function Dialog(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="h2" style={{ marginBottom: 6 }}>
              {props.title}
            </p>
            {props.description ? (
              <p className="text2" style={{ margin: 0 }}>
                {props.description}
              </p>
            ) : null}
          </div>
          <button className="btn" type="button" onClick={props.onClose} aria-label="Fechar">
            Fechar
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{props.children}</div>

        {props.footer ? <div style={{ marginTop: 14 }}>{props.footer}</div> : null}
      </div>
    </div>
  );
}

