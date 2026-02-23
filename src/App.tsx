import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
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

// PocketBase Instanz (Ersetze die IP durch die deines Linux-Servers)
const pb = new PocketBase('http://127.0.0.1:8090');
const COLLECTION_NAME = 'meals_data';

const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default function WeeklyMealPlanner() {
  const [meals, setMeals] = useState<MealsState>({});
  const [orders, setOrders] = useState<Orders>({});
  const [currentName, setCurrentName] = useState("");
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[0]);
  const [selectedMealNumber, setSelectedMealNumber] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  // Daten beim Start laden
  useEffect(() => {
    async function loadInitialData() {
      try {
        // 1. Versuch: PocketBase
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        setMeals(record.content.meals || {});
        setOrders(record.content.orders || {});
        setIsOnline(true);
        console.log("Daten von PocketBase geladen");
      } catch (err) {
        // 2. Versuch: Fallback LocalStorage
        console.warn("PocketBase nicht erreichbar, nutze LocalStorage");
        const savedMeals = localStorage.getItem("meals");
        const savedOrders = localStorage.getItem("orders");
        if (savedMeals) setMeals(JSON.parse(savedMeals));
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        setIsOnline(false);
      }
    }
    loadInitialData();
  }, []);

  // Daten synchronisieren (PocketBase & LocalStorage)
  useEffect(() => {
    // Immer im LocalStorage sichern (als Backup)
    localStorage.setItem("meals", JSON.stringify(meals));
    localStorage.setItem("orders", JSON.stringify(orders));

    // Wenn online, auch in PocketBase sichern
    const syncPocketBase = async () => {
      try {
        const data = { content: { meals, orders } };
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        await pb.collection(COLLECTION_NAME).update(record.id, data);
      } catch (err) {
        // Falls kein Record existiert, neu erstellen
        try {
          await pb.collection(COLLECTION_NAME).create({ content: { meals, orders } });
        } catch (e) {
          setIsOnline(false);
        }
      }
    };

    if (Object.keys(meals).length > 0 || Object.keys(orders).length > 0) {
      syncPocketBase();
    }
  }, [meals, orders]);

  const addMeal = (day: string, meal: Meal) => {
    setMeals((prev: MealsState) => ({
      ...prev,
      [day]: [...(prev[day] || []), meal],
    }));
  };

  const addOrder = () => {
    if (!currentName || !selectedMealNumber) return;

    const meal = meals[selectedDay]?.find((m: Meal) => m.number === selectedMealNumber);
    if (!meal) return;

    setOrders((prev: Orders) => ({
      ...prev,
      [currentName]: { ...(prev[currentName] || {}), [selectedDay]: meal },
    }));
    setSelectedMealNumber("");
  };

  const calculateBill = (name: string) => {
    const userOrders = orders[name] || {};
  
    return Object.values(userOrders).reduce((sum: number, meal: Meal) => {
      // Falls price kein String ist (z.B. schon eine Number), wandeln wir ihn sicherheitshalber um
      const priceString = String(meal.price).replace(',', '.');
      const priceNum = parseFloat(priceString);

      // Falls der Preis ungültig ist (z.B. Text statt Zahl), addieren wir 0, um Fehler zu vermeiden
      return sum + (isNaN(priceNum) ? 0 : priceNum);
    }, 0);
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
