import { useState } from 'react';
import { Carrot, Leaf, AlertTriangle } from 'lucide-react';
import { mealItemSchema } from '../lib/validation';
import { ALLERGENS } from '../types';
import type { MealItem } from '../types';

interface AddMealFormProps {
  day: string;
  autoNumber: number;
  onAdd: (day: string, meal: MealItem) => void;
}

const PRICE_REGEX = /^[0-9]*[.,]?[0-9]*$/;

export function AddMealForm({ day, autoNumber, onAdd }: AddMealFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
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
      number: String(autoNumber),
      name,
      price: priceNum,
      vegetarian,
      vegan,
      allergens: selectedAllergens,
      description: description.trim() || undefined,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errs[String(issue.path[0])] = issue.message;
      });
      setErrors(errs);
      return;
    }

    setErrors({});
    onAdd(day, result.data);
    setName('');
    setPrice('');
    setDescription('');
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
        <span className="add-meal-form__num-badge" aria-label={`Menünummer ${autoNumber}`}>
          #{autoNumber}
        </span>
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
          style={{ width: '120px' }}
          aria-label="Preis"
        />
        <div className="add-meal-form__flags">
          <label
            className={`diet-flag diet-flag--veg${(vegetarian || vegan) ? ' diet-flag--active' : ''}`}
            title={vegetarian || vegan ? 'Vegetarisch (aktiv – klicken zum Deaktivieren)' : 'Vegetarisch'}
          >
            <input
              type="checkbox"
              checked={vegetarian || vegan}
              onChange={e => { setVegetarian(e.target.checked); if (!e.target.checked) setVegan(false); }}
              aria-label="Vegetarisch"
            />
            <Carrot size={16} />
          </label>
          <label
            className={`diet-flag diet-flag--vegan${vegan ? ' diet-flag--active' : ''}`}
            title={vegan ? 'Vegan (aktiv – klicken zum Deaktivieren)' : 'Vegan'}
          >
            <input
              type="checkbox"
              checked={vegan}
              onChange={e => { setVegan(e.target.checked); if (e.target.checked) setVegetarian(true); }}
              aria-label="Vegan"
            />
            <Leaf size={16} />
          </label>
          <span className="allergen-toggle">
            <button
              type="button"
              className={`btn-icon${showAllergens || selectedAllergens.length > 0 ? ' btn-icon--active' : ''}`}
              onClick={() => setShowAllergens(v => !v)}
              title={selectedAllergens.length > 0 ? `${selectedAllergens.length} Allergen(e) ausgewählt` : 'Allergene'}
              aria-expanded={showAllergens}
            >
              <AlertTriangle size={16} />
            </button>
            {selectedAllergens.length > 0 && (
              <span className="allergen-toggle__count" aria-hidden="true">
                {selectedAllergens.length}
              </span>
            )}
          </span>
        </div>
        <button
          className="btn btn--success btn--sm"
          onClick={handleAdd}
          disabled={!name || !price}
          aria-label="Gericht hinzufügen"
        >
          + Hinzufügen
        </button>
      </div>

      {/* Optional extended description */}
      <input
        className="form-input form-input--sm add-meal-form__desc"
        placeholder="Beschreibung (optional) – Zutaten, Zusatzstoffe …"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={300}
        aria-label="Beschreibung des Gerichts"
      />

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
