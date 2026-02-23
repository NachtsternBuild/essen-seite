import { useState, useEffect } from 'react';
import './App.css';

// 1. Definition der Typen
interface Meal {
  name: string;
  price: string | number;
  number: string;
}

interface Orders {
  [name: string]: {
    [day: string]: Meal;
  };
}

interface MealsState {
  [day: string]: Meal[];
}

const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default function WeeklyMealPlanner() {
  // States mit expliziten Typen initialisieren
  const [meals, setMeals] = useState<MealsState>(() => {
    const saved = localStorage.getItem("meals");
    return saved ? JSON.parse(saved) : {};
  });

  const [orders, setOrders] = useState<Orders>(() => {
    const saved = localStorage.getItem("orders");
    return saved ? JSON.parse(saved) : {};
  });

  const [currentName, setCurrentName] = useState("");
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[0]);
  const [selectedMealNumber, setSelectedMealNumber] = useState("");

  useEffect(() => {
    localStorage.setItem("meals", JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]);

  const addMeal = (day: string, meal: Meal) => {
    setMeals((prev: MealsState) => ({
      ...prev,
      [day]: [...(prev[day] || []), meal],
    }));
  };

  const addOrder = () => {
    if (!currentName || !selectedMealNumber) return;

    const meal = meals[selectedDay]?.find(
      (m: Meal) => m.number === selectedMealNumber
    );
    if (!meal) return;

    setOrders((prev: Orders) => ({
      ...prev,
      [currentName]: {
        ...(prev[currentName] || {}),
        [selectedDay]: meal,
      },
    }));

    setSelectedMealNumber("");
  };

  const calculateBill = (name: string) => {
    const userOrders = orders[name] || {};
    return Object.values(userOrders).reduce(
      (sum: number, meal: Meal) => sum + Number(meal.price),
      0
    );
  };
  
  const resetWeek = () => {
    if (!confirm("Wirklich alles für diese Woche löschen?")) return;
    setMeals({});
    setOrders({});
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Wochen-Speiseplan</h1>

      {daysOfWeek.map((day) => (
        <div key={day} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 15 }}>
          <h2>{day}</h2>

          {(meals[day] || []).map((meal, idx) => (
            <div key={idx}>
              #{meal.number} – {meal.name} ({meal.price} €)
            </div>
          ))}

          <AddMealForm day={day} onAdd={addMeal} />
        </div>
      ))}

      <div style={{ border: "2px solid black", padding: 15, marginTop: 30 }}>
        <h2>Essen auswählen</h2>

        <input
          placeholder="Dein Name"
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
        />

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          {daysOfWeek.map((day) => (
            <option key={day}>{day}</option>
          ))}
        </select>

        <input
          placeholder="Menü Nummer"
          value={selectedMealNumber}
          onChange={(e) => setSelectedMealNumber(e.target.value)}
        />

        <button onClick={addOrder}>Eintragen</button>
        <button onClick={resetWeek}
  		  style={{ 
    	 	marginTop: 40, 
    		padding: 10, 
    		backgroundColor: "red", 
    		color: "white",
    		border: "none",
    		cursor: "pointer"
  		  }}
	  	>Woche zurücksetzen</button>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Bestellungen & Abrechnung</h2>

        {Object.keys(orders).map((name) => (
          <div key={name} style={{ border: "1px solid #aaa", padding: 10, marginBottom: 10 }}>
            <strong>{name}</strong>

            {Object.entries(orders[name]).map(([day, meal], idx) => (
              <div key={idx}>
                {day}: {meal.name} ({meal.price} €)
              </div>
            ))}

            <div>
              <strong>Gesamt: {calculateBill(name).toFixed(2)} €</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Props Interface für die Form
interface AddMealFormProps {
  day: string;
  onAdd: (day: string, meal: Meal) => void;
}

function AddMealForm({ day, onAdd }: AddMealFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [number, setNumber] = useState("");

  const handleAdd = () => {
    if (!name || !price || !number) return;
    onAdd(day, { name, price, number });
    setName(""); setPrice(""); setNumber("");
  };

  return (
    <div style={{ marginTop: 10 }}>
      <input
        placeholder="Nummer"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <input
        placeholder="Essen"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Preis (€)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button onClick={handleAdd}>Menü hinzufügen</button>
    </div>
  );
}
