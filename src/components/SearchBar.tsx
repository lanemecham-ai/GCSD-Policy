type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="field-group">
      <span className="field-label">Search policies</span>
      <input
        type="text"
        placeholder="Search title, category, or content"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
