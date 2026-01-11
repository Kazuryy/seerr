interface RatingInputProps {
  value?: number;
  onChange: (rating: number | undefined) => void;
  readonly?: boolean;
  placeholder?: string;
}

const RatingInput = ({
  value,
  onChange,
  readonly = false,
  placeholder = 'Rating (1-10)',
}: RatingInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      onChange(undefined);
      return;
    }

    const numValue = parseInt(inputValue, 10);

    if (isNaN(numValue)) {
      return;
    }

    // Clamp between 1 and 10
    const clampedValue = Math.max(1, Math.min(10, numValue));
    onChange(clampedValue);
  };

  return (
    <input
      type="number"
      min="1"
      max="10"
      step="1"
      value={value ?? ''}
      onChange={handleChange}
      disabled={readonly}
      placeholder={placeholder}
      className="w-24 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
};

export default RatingInput;
