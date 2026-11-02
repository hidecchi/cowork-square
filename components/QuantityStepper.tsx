type Props = {
  quantity: number;
  min?: number;
  max: number;
  onChange: (quantity: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
};

export function QuantityStepper({
  quantity,
  min = 1,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: Props) {
  const dec = () => onChange(Math.max(min, quantity - 1));
  const inc = () => onChange(Math.min(max, quantity + 1));

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={dec}
        disabled={quantity <= min}
        aria-label={decreaseLabel}
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
        aria-label={increaseLabel}
      >
        ＋
      </button>
    </div>
  );
}
