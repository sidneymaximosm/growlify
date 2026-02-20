import React from "react";

export function Modal(props: { title: string; description: string; confirmText: string; cancelText: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="h2" style={{ marginBottom: 6 }}>{props.title}</p>
            <p className="text2" style={{ margin: 0 }}>{props.description}</p>
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn" onClick={props.onCancel} type="button">{props.cancelText}</button>
          <button className="btn btnDanger" onClick={props.onConfirm} type="button">{props.confirmText}</button>
        </div>
      </div>
    </div>
  );
}

