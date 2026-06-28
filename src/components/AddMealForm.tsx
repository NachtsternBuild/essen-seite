import { useState } from 'react';
import { mealItemSchema } from '../lib/validation';
import { ALLERGENS } from '../types';
import type { MealItem } from '../types';

interface AddMealFormProps {
  day: string;
  existingNumbers?: string[];
  onAdd: (day: string, meal: MealItem) => void;
}

const PRICE_REGEX = /^[0-9]*[.,]?[0-9]*$/;

export function AddMealForm({ day, existingNumbers = [], onAdd }: AddMealFormProps) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [vegetarian, setVegetarian] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [showAllergens, setShowAllergens] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePriceChange = (val: string) => {
    if (val === '' || PRICE_REGEX.test(val)) setPrice(val);
  };

  const toggleAllergen = (code: string) => {
    setSelectedAllergens(prev =>
      prev.includes(code) ? prev.filter(a => a !== code) : [...prev, code]
    );
  };

  const handleAdd = () => {
    const priceNum = parseFloat(price.replace(',', '.'));
    const result = mealItemSchema.safeParse({
      number: num,
      name,
      price: priceNum,
      vegetarian,
      vegan,
      allergens: selectedAllergens,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message;
      });
      setErrors(errs);
      return;
    }

    if (existingNumbers.includes(num)) {
      setErrors({ number: `Menünummer #${num} existiert bereits für ${day}.` });
      return;
    }

    setErrors({});
    onAdd(day, result.data);
    setNum('');
    setName('');
    setPrice('');
    setVegetarian(false);
    setVegan(false);
    setSelectedAllergens([]);
    setShowAllergens(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="add-meal-form">
      <div className="add-meal-form__row">
        <input
          className={`form-input form-input--sm${errors.number ? ' form-input--error' : ''}`}
          type="text"
          inputMode="numeric"
          placeholder="Nr."
          value={num}
          onChange={e => setNum(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: '60px' }}
          aria-label="Menünummer"
          aria-describedby={errors.number ? 'am-num-err' : undefined}
        />
        <input
          className={`form-input form-input--sm${errors.name ? ' form-input--error' : ''}`}
          placeholder="Gericht"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          aria-label="Gerichtname"
        />
        <input
          className={`form-input form-input--sm${errors.price ? ' form-input--error' : ''}`}
          placeholder="Preis (5,50)"
          value={price}
          onChange={e => handlePriceChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: '90px' }}
          aria-label="Preis"
        />
        <div className="add-meal-form__flags">
          <label className="diet-flag diet-flag--veg" title="Vegetarisch">
            <input
              type="checkbox"
              checked={vegetarian || vegan}
              onChange={e => setVegetarian(e.target.checked)}
              aria-label="Vegetarisch"
            />
            🥦
          </label>
          <label className="diet-flag diet-flag--vegan" title="Vegan">
            <input
              type="checkbox"
              checked={vegan}
              onChange={e => { setVegan(e.target.checked); if (e.target.checked) setVegetarian(true); }}
              aria-label="Vegan"
            />
            🌱
          </label>
          <button
            type="button"
            className={`btn-icon${showAllergens ? ' btn-icon--active' : ''}`}
            onClick={() => setShowAllergens(v => !v)}
            title="Allergene"
            aria-expanded={showAllergens}
          >
            ⚠️
          </button>
        </div>
        <button
          className="btn btn--success btn--sm"
          onClick={handleAdd}
          disabled={!num || !name || !price}
          aria-label="Gericht hinzufügen"
        >
          + Hinzufügen
        </button>
      </div>

      {/* Inline validation errors */}
      {Object.keys(errors).length > 0 && (
        <div className="add-meal-form__errors" role="alert">
          {Object.values(errors).map((err, i) => (
            <span key={i} className="form-error">{err}</span>
          ))}
        </div>
      )}

      {/* Allergen picker */}
      {showAllergens && (
        <div className="allergen-picker">
          <span className="allergen-picker__label">Allergene:</span>
          {Object.entries(ALLERGENS).map(([code, label]) => (
            <label key={code} className="allergen-chip">
              <input
                type="checkbox"
                checked={selectedAllergens.includes(code)}
                onChange={() => toggleAllergen(code)}
              />
              <span
                className={`allergen-chip__inner${selectedAllergens.includes(code) ? ' allergen-chip__inner--active' : ''}`}
              >
                {code}: {label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
