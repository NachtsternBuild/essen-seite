import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import './App.css';

// --- Typen ---
interface Meal {
  name: string;
  price: string | number;
  number: string;
}

interface Orders {
  [name: string]: { [day: string]: Meal };
}

interface MealsState {
  [day: string]: Meal[];
}

interface WeekData {
  meals: MealsState;
  orders: Orders;
}

interface AppData {
  current: WeekData;
  previous: WeekData | null;
}

const pb = new PocketBase('http://127.0.0.1:8090');
const COLLECTION_NAME = 'meals_data';
const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default function WeeklyMealPlanner() {
  const [view, setView] = useState<"current" | "archive">("current");
  const [data, setData] = useState<AppData>({
    current: { meals: {}, orders: {} },
    previous: null
  });
  const [isOnline, setIsOnline] = useState(false);

  const [currentName, setCurrentName] = useState("");
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[0]);
  const [selectedMealNumber, setSelectedMealNumber] = useState("");

  // Daten laden
  useEffect(() => {
    async function loadData() {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        if (record.content) setData(record.content);
        setIsOnline(true);
      } catch (err) {
        const saved = localStorage.getItem("meal_planner_data");
        if (saved) setData(JSON.parse(saved));
        setIsOnline(false);
      }
    }
    loadData();
  }, []);

  // Sync
  useEffect(() => {
    localStorage.setItem("meal_planner_data", JSON.stringify(data));
    const sync = async () => {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        await pb.collection(COLLECTION_NAME).update(record.id, { content: data });
        setIsOnline(true);
      } catch (e) {
        try {
          await pb.collection(COLLECTION_NAME).create({ content: data });
          setIsOnline(true);
        } catch (err) { setIsOnline(false); }
      }
    };
    sync();
  }, [data]);

  const addMeal = (day: string, meal: Meal) => {
    setData(prev => ({
      ...prev,
      current: { ...prev.current, meals: { ...prev.current.meals, [day]: [...(prev.current.meals[day] || []), meal] } }
    }));
  };

  const addOrder = () => {
    if (!currentName || !selectedMealNumber) return;
    const meal = data.current.meals[selectedDay]?.find(m => m.number === selectedMealNumber);
    if (!meal) return alert("Menü-Nummer für diesen Tag nicht gefunden!");

    setData(prev => ({
      ...prev,
      current: {
        ...prev.current,
        orders: {
          ...prev.current.orders,
          [currentName]: { ...(prev.current.orders[currentName] || {}), [selectedDay]: meal }
        }
      }
    }));
    setSelectedMealNumber("");
  };

  const resetWeek = () => {
    if (!confirm("Aktuelle Woche in die Vorwoche verschieben und neu starten?")) return;
    setData(prev => ({
      previous: prev.current,
      current: { meals: {}, orders: {} }
    }));
  };

  // Hilfsfunktion: Berechnet Preis für eine einzelne Person
  const calculateUserTotal = (userOrders: { [day: string]: Meal }) => {
    return Object.values(userOrders).reduce((sum, meal) => {
      const p = parseFloat(String(meal.price).replace(',', '.'));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
  };
  
  // Berechnet die Gesamtsumme über alle Nutzer hinweg
  const calculateGrandTotal = (orders: Orders) => {
    return Object.values(orders).reduce((totalSum, userOrders) => {
      return totalSum + calculateUserTotal(userOrders);
    }, 0);
  };
  
  // 1. Ein bestimmtes Menü aus dem Tagesangebot löschen
  const removeMealTemplate = (day: string, index: number) => {
    setData(prev => {
      const newMeals = { ...prev.current.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      return { ...prev, current: { ...prev.current, meals: newMeals } };
    });
  };

  // 2. Eine spezifische Bestellung einer Person an einem Tag löschen
  const removeSingleOrder = (person: string, day: string) => {
    setData(prev => {
      const newUserOrders = { ...prev.current.orders[person] };
      delete newUserOrders[day];
    
      const newOrders = { ...prev.current.orders };
      if (Object.keys(newUserOrders).length === 0) {
        delete newOrders[person]; // Nutzer ganz löschen, wenn keine Bestellungen mehr da sind
      } else {
        newOrders[person] = newUserOrders;
      }
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };

  // 3. Einen Nutzer mit allen seinen Bestellungen komplett entfernen
  const removeUserCompletely = (person: string) => {
    if (!confirm(`Möchtest du ${person} wirklich komplett aus der Liste löschen?`)) return;
    setData(prev => {
      const newOrders = { ...prev.current.orders };
      delete newOrders[person];
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };

  const renderWeek = (weekData: WeekData, isArchive: boolean) => {
  const grandTotal = calculateGrandTotal(weekData.orders);

  return (
    <div>
      <h2 style={{ color: isArchive ? "#666" : "#333" }}>
        {isArchive ? "🍴 Aktuelle Woche" : "🍴 Nächste Woche"}
        </h2>

        {daysOfWeek.map(day => (
          <div key={day} style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "#fff" }}>
            <h3 style={{ borderBottom: "2px solid #eee" }}>{day}</h3>
          
            {/* Menü-Angebot mit Lösch-Button */}
            <div style={{ marginBottom: "10px" }}>
              <strong>Menü-Angebot:</strong>
              {weekData.meals[day]?.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "center", maxWidth: "400px", fontSize: "0.95em" }}>
                  <span>#{m.number} - {m.name} ({m.price}€)
                  {!isArchive && (
                    <button onClick={() => removeMealTemplate(day, i)} style={{ border: "none", background: "none", color: "red", cursor: "pointer" }}>✕</button>
                  )}
                  </span>
                </div>
              ))}
            </div>

            {/* Tages-Bestellungen mit Einzel-Lösch-Button */}
            <div style={{ backgroundColor: "#fcfcfc", padding: "10px", borderRadius: "5px" }}>
              <strong>Bestellungen {day}:</strong>
              <ul style={{ listStyle: "none", padding: "5px 0" }}>
                {Object.entries(weekData.orders).map(([person, days]) => (
                  days[day] ? (
                    <li key={person} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
                      {!isArchive && (
                        <button onClick={() => removeSingleOrder(person, day)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.8em" }}>🗑️</button>
                      )}
                      <span><strong>{person}:</strong> Menü #{days[day].number}</span>
                    </li>
                  ) : null
                ))}
              </ul>
            </div>
            {!isArchive && <AddMealForm day={day} onAdd={addMeal} />}
          </div>
        ))}

        {/* Abrechnung mit "Nutzer komplett löschen"-Button */}
        <div style={{ background: "#e9ecef", padding: "20px", borderRadius: "8px", marginTop: "30px" }}>
          <h3>💰 Abrechnung</h3>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <th>Name</th>
                <th>Tage</th>
                <th>Summe</th>
                {!isArchive && <th>Aktion</th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(weekData.orders).map(([person, userOrders]) => (
                <tr key={person} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 0" }}>{person}</td>
                  <td>{Object.keys(userOrders).length}x</td>
                  <td><strong>{calculateUserTotal(userOrders).toFixed(2)} €</strong></td>
                  {!isArchive && (
                    <td>
                      <button onClick={() => removeUserCompletely(person)} style={{ fontSize: "0.7em", backgroundColor: "#ffdfdf", border: "1px solid red", borderRadius: "3px", cursor: "pointer" }}>Nutzer entfernen</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#ddd" }}>
                <td colSpan={2} style={{ padding: "10px", fontWeight: "bold" }}>GESAMT (Alle Personen)</td>
                <td colSpan={!isArchive ? 2 : 1} style={{ padding: "10px" }}>
                  <strong style={{ fontSize: "1.1em", color: "#d32f2f" }}>{grandTotal.toFixed(2)} €</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", fontFamily: "Arial, sans-serif", color: "#333" }}>
      <nav style={{ marginBottom: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setView("current")} style={navBtnStyle(view === "current")}>Nächste Woche</button>
        <button onClick={() => setView("archive")} style={navBtnStyle(view === "archive")}>Aktuelle Woche</button>
        <div style={{ marginLeft: "auto", fontSize: "0.8em", color: isOnline ? "green" : "red" }}>
          {isOnline ? "● Server Sync" : "○ Offline (Lokal)"}
        </div>
      </nav>

      {view === "current" ? (
        <>
          {renderWeek(data.current, false)}
          
          <div style={{ border: "2px solid #007bff", padding: "20px", marginTop: "40px", borderRadius: "10px", backgroundColor: "#f0f7ff" }}>
            <h3>Essen bestellen</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input placeholder="Dein Name" value={currentName} onChange={e => setCurrentName(e.target.value)} style={inputStyle} />
              <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} style={inputStyle}>
                {daysOfWeek.map(d => <option key={d}>{d}</option>)}
              </select>
              <input placeholder="Menü Nr." size={8} value={selectedMealNumber} onChange={e => setSelectedMealNumber(e.target.value)} style={inputStyle} />
              <button onClick={addOrder} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Bestellung speichern</button>
            </div>
          </div>
          
          <button onClick={resetWeek} style={{ marginTop: "50px", background: "#dc3545", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", width: "100%" }}>
            Woche abschließen & ins Archiv verschieben
          </button>
        </>
      ) : (
        data.previous ? renderWeek(data.previous, true) : <p style={{ textAlign: "center", color: "#999", marginTop: "50px" }}>Keine Daten in der Vorwoche vorhanden.</p>
      )}
    </div>
  );
}

// Kleine Styling-Helfer
const navBtnStyle = (active: boolean) => ({
  padding: "10px 20px",
  backgroundColor: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: active ? ("bold" as const) : ("normal" as const)
});

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "1em"
};

function AddMealForm({ day, onAdd }: { day: string, onAdd: (day: string, meal: Meal) => void }) {
  const [n, setN] = useState(""); const [p, setP] = useState(""); const [num, setNum] = useState("");
  return (
    <div style={{ marginTop: "15px", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
      <span style={{ fontSize: "0.8em", color: "#666" }}>Menü hinzufügen:</span><br/>
      <input placeholder="Nr" size={2} value={num} onChange={e => setNum(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Name des Gerichts" value={n} onChange={e => setN(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Preis" size={4} value={p} onChange={e => setP(e.target.value)} />
      <button onClick={() => { if(!n||!p||!num) return; onAdd(day, { name: n, price: p, number: num }); setN(""); setP(""); setNum(""); }} style={{ marginLeft: "5px" }}>+</button>
    </div>
  );
}
