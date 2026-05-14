import { useState } from 'react';
import type { Meal } from '../types';

interface AddMealFormProps {
  day: string;
  onAdd: (day: string, meal: Meal) => void;
}

const PRICE_REGEX = /^[0-9]*[.,]?[0-9]*$/;

export function AddMealForm({ day, onAdd }: AddMealFormProps) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handlePriceChange = (val: string) => {
    if (val === '' || PRICE_REGEX.test(val)) setPrice(val);
  };

  const handleAdd = () => {
    if (!num || !name || !price) return;
    onAdd(day, { name, price, number: num });
    setNum('');
    setName('');
    setPrice('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="add-meal-form">
      <input
        className="form-input form-input--sm"
        type="number"
        placeholder="Nr."
        value={num}
        onChange={e => setNum(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '60px' }}
        aria-label="Menünummer"
      />
      <input
        className="form-input form-input--sm"
        placeholder="Gericht"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Gerichtname"
      />
      <input
        className="form-input form-input--sm"
        placeholder="Preis (5,50)"
        value={price}
        onChange={e => handlePriceChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '100px' }}
        aria-label="Preis"
      />
      <button
        className="btn btn--success btn--sm"
        onClick={handleAdd}
        disabled={!num || !name || !price}
        aria-label="Gericht hinzufügen"
      >
        + Hinzufügen
      </button>
    </div>
  );
}
