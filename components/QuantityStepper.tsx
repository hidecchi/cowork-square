type Props = {
  quantity: number;
  min?: number;
  max: number;
  onChange: (quantity: number) => void;
};

export function QuantityStepper({ quantity, min = 1, max, onChange }: Props) {
  const dec = () => onChange(Math.max(min, quantity - 1));
  const inc = () => onChange(Math.min(max, quantity + 1));

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={dec}
        disabled={quantity <= min}
        aria-label="数量を減らす"
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="stepper-btn stepper-btn-plus"
        onClick={inc}
        disabled={quantity >= max}
        aria-label="数量を増やす"
      >
        ＋
      </button>
    </div>
  );
}
