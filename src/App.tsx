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
  
  const getWeeklySummary = () => {
    const summary: { [day: string]: { [num: string]: { name: string, count: number } } } = {};
    let totalWeeklySum = 0;

    // Wir gehen durch alle Personen
    Object.values(orders).forEach(userDayMap => {
      // Wir gehen durch jeden Tag, an dem diese Person bestellt hat
      Object.entries(userDayMap).forEach(([day, meal]) => {
        if (!summary[day]) summary[day] = {};
      
        if (!summary[day][meal.number]) {
          summary[day][meal.number] = { name: meal.name, count: 0 };
        }
      
        summary[day][meal.number].count += 1;

        // Preis-Berechnung für die Gesamtsumme
        const priceNum = parseFloat(String(meal.price).replace(',', '.'));
        totalWeeklySum += isNaN(priceNum) ? 0 : priceNum;
      });
    });

    return { summary, totalWeeklySum };
  };

  const { summary, totalWeeklySum } = getWeeklySummary();
  
  const resetWeek = async () => {
    if (!confirm("Wirklich alles für diese Woche löschen?")) return;

    // 1. Lokalen State leeren (UI wird sofort aktualisiert)
    setMeals({});
    setOrders({});

    // 2. LocalStorage leeren (Fallback-Sicherheit)
    localStorage.removeItem("meals");
    localStorage.removeItem("orders");

    // 3. PocketBase leeren
    try {
      const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
      // Wir setzen das 'content' Feld in der DB auf leer zurück
      await pb.collection(COLLECTION_NAME).update(record.id, {
        content: { meals: {}, orders: {} }
      });
      console.log("Datenbank erfolgreich zurückgesetzt");
      setIsOnline(true);
    } catch (err) {
      console.error("Fehler beim Zurücksetzen der Datenbank:", err);
      setIsOnline(false);
      // Da LocalStorage oben schon geleert wurde, ist der Fallback hier "sauber"
    }
  };
  
  const removeMeal = (day: string, index: number) => {
    setMeals((prev) => {
      const newMeals = { ...prev };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      return newMeals;
    });
  };
  
  // Einzelnen Tag eines Nutzers löschen
  const removeOrder = (name: string, day: string) => {
    setOrders((prev) => {
      const userOrders = { ...prev[name] };
      delete userOrders[day]; // Entfernt den spezifischen Tag

      const newOrders = { ...prev };
      if (Object.keys(userOrders).length === 0) {
        delete newOrders[name]; // Wenn keine Tage mehr übrig sind, Nutzer ganz löschen
      } else {
        newOrders[name] = userOrders;
      }
      return newOrders;
    });
  };

  // Kompletten Nutzer (z.B. Heinz) löschen
  const removeUserEntirely = (name: string) => {
    if (!confirm(`Alle Bestellungen von ${name} wirklich löschen?`)) return;
    setOrders((prev) => {
      const newOrders = { ...prev };
      delete newOrders[name];
      return newOrders;
    });
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Wochen-Speiseplan</h1>
	  <p style={{ color: isOnline ? "green" : "red" }}>
	  Status: {isOnline ? "♦" : "♦"}
	  </p>

      {daysOfWeek.map((day) => (
        <div key={day} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 15 }}>
          <h2>{day}</h2>

          {(meals[day] || []).map((meal, idx) => (
  		  <div key={idx} style={{ display: "flex", justifyContent: "space-between", maxWidth: "300px" }}>
    	  	<span>#{meal.number} – {meal.name} ({meal.price} €)</span>
    	  	<button onClick={() => removeMeal(day, idx)} style={{ marginLeft: 10, color: "red" }}>x</button>
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
    	<div key={name} style={{ border: "1px solid #aaa", padding: 10, marginBottom: 10, position: 'relative' }}>
      		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        		<strong>{name}</strong>
        		<button onClick={() => removeUserEntirely(name)}
          		style={{ backgroundColor: "#ffcccc", border: "1px solid red", fontSize: "0.8em", cursor: "pointer" }}
        		>Komplett löschen
        		</button>
      		</div>

      	{Object.entries(orders[name]).map(([day, meal], idx) => (
        <div key={idx} style={{ fontSize: "0.9em", margin: "5px 0", display: "flex", alignItems: "center" }}>
          <button 
            onClick={() => removeOrder(name, day)}
            style={{ marginRight: 10, border: "none", background: "none", cursor: "pointer", color: "red" }}
          >
            🗑️
          </button>
          {day}: {meal.name} ({meal.price} €)
        </div>
      		))}

      		<div style={{ borderTop: "1px solid #eee", marginTop: 5 }}>
        		<strong>Gesamt: {calculateBill(name).toFixed(2)} €</strong>
      		</div>
    	</div>
  		))}
  
        <div style={{ marginTop: 40, padding: 20, border: "1px solid #ddd" }}>
  		<h2>Einkaufsliste / Küchen-Übersicht</h2>
  
  		{daysOfWeek.map(day => (
    		summary[day] ? (
      		<div key={day} style={{ marginBottom: 15 }}>
        		<h3 style={{ margin: "5px 0" }}>{day}</h3>
        		{Object.entries(summary[day]).map(([num, data]) => (
          		<div key={num}>
            		<strong>{data.count}x</strong> – Menü #{num} ({data.name})
          		</div>
        		))}
      		</div>
    		) : null
  		))}
  		<div style={{ marginTop: 20, paddingTop: 10, borderTop: "2px solid #333", fontSize: "1.2em" }}>
    		<strong>Gesamtkosten alle Personen: {totalWeeklySum.toFixed(2)} €</strong>
  		</div>
		</div>
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
