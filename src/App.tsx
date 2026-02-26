import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

import './App.css';

// typedefinition
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

// Server Adresse
const pb = new PocketBase(
  import.meta.env.DEV 
    ? 'http://127.0.0.1:8090' // for dev
    : undefined               // as pb_public
);
const COLLECTION_NAME = 'meals_data';
const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

// default functions to plan the week
export default function WeeklyMealPlanner() {
  const [view, setView] = useState<"current" | "archive">("current");
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem("meal_planner_data");
    return saved ? JSON.parse(saved) : { current: { meals: {}, orders: {} }, previous: null };
  });
  const [isOnline, setIsOnline] = useState(false);
  
  const [currentName, setCurrentName] = useState("");
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[0]);
  const [selectedMealNumber, setSelectedMealNumber] = useState("");

  // init sync with db
  useEffect(() => {
    async function fetchFromPB() {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        if (record.content) {
          setData(record.content);
          localStorage.setItem("meal_planner_data", JSON.stringify(record.content));
        }
        setIsOnline(true);
      } catch (err) {
        console.log("PocketBase nicht erreichbar.");
        setIsOnline(false);
      }
    }
    fetchFromPB();
  }, []);

  // automatic save everything to db
  useEffect(() => {
    localStorage.setItem("meal_planner_data", JSON.stringify(data));
    
    const timer = setTimeout(async () => {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        await pb.collection(COLLECTION_NAME).update(record.id, { content: data });
        setIsOnline(true);
      } catch (e) {
        try {
          await pb.collection(COLLECTION_NAME).create({ content: data });
          setIsOnline(true);
        } catch (err) {
          setIsOnline(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data]);

  // add new menu to list
  const addMeal = (day: string, meal: Meal) => {
    setData(prev => ({
      ...prev,
      current: { ...prev.current, meals: { ...prev.current.meals, [day]: [...(prev.current.meals[day] || []), meal] } }
    }));
  };
  
  // function to order a meal
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
  
  // function to reset the weeks
  const resetWeek = () => {
    if (!confirm("Nächste Woche in die Aktuelle Woche verschieben und neu starten?")) return;
    setData(prev => ({
      previous: prev.current,
      current: { meals: {}, orders: {} }
    }));
  };
  
  // calculate the user bill
  const calculateUserTotal = (userOrders: { [day: string]: Meal }) => {
    return Object.values(userOrders).reduce((sum, meal) => {
      const p = parseFloat(String(meal.price).replace(',', '.'));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
  };
  
  // calculate the total bill
  const calculateGrandTotal = (orders: Orders) => {
    return Object.values(orders).reduce((totalSum, userOrders) => {
      return totalSum + calculateUserTotal(userOrders);
    }, 0);
  };
  
  // remove a meal from the menu
  const removeMealTemplate = (day: string, index: number) => {
    setData(prev => {
      const newMeals = { ...prev.current.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      return { ...prev, current: { ...prev.current, meals: newMeals } };
    });
  };
  
  // remove a single order from a person
  const removeSingleOrder = (person: string, day: string) => {
    setData(prev => {
      const newUserOrders = { ...prev.current.orders[person] };
      delete newUserOrders[day];
      const newOrders = { ...prev.current.orders };
      if (Object.keys(newUserOrders).length === 0) {
        delete newOrders[person];
      } else {
        newOrders[person] = newUserOrders;
      }
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };
  
  // remove a user from and his orders
  const removeUserCompletely = (person: string) => {
    if (!confirm(`Möchtest du ${person} wirklich komplett löschen?`)) return;
    setData(prev => {
      const newOrders = { ...prev.current.orders };
      delete newOrders[person];
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };

  // export a week as .txt file
  const exportWeekAsText = (weekData: WeekData, title: string) => {
    let text = `SPEISEPLAN & BESTELLUNGEN - ${title.toUpperCase()}\n`;
    text += `==========================================\n\n`;
    daysOfWeek.forEach(day => {
      text += `--- ${day.toUpperCase()} ---\nAngebot:\n`;
      (weekData.meals[day] || []).forEach(m => { text += `  [#${m.number}] ${m.name} (${m.price}€)\n`; });
      text += `Bestellungen:\n`;
      Object.entries(weekData.orders).forEach(([person, days]) => {
        if (days[day]) text += `  • ${person}: Menü #${days[day].number}\n`;
      });
      text += `\n`;
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Speiseplan_${title.replace(/\s+/g, '_')}.txt`;
    link.click();
  };
  
  // export a week as .csv file
  const exportWeekAsCSV = (weekData: WeekData, title: string) => {
    const rows = [["Tag", "Name", "Menu Nr.", "Gericht", "Preis (EUR)"]];
    daysOfWeek.forEach(day => {
      Object.entries(weekData.orders).forEach(([person, days]) => {
        if (days[day]) {
          rows.push([day, person, `#${days[day].number}`, days[day].name, String(days[day].price).replace('.', ',')]);
        }
      });
    });
    rows.push([], ["ABRECHNUNG"], ["Name", "Anzahl", "Summe"]);
    Object.entries(weekData.orders).forEach(([person, userOrders]) => {
      rows.push([person, `${Object.keys(userOrders).length}x`, calculateUserTotal(userOrders).toFixed(2).replace('.', ',')]);
    });
    const csvContent = rows.map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bestellungen_${title.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  // create the week
  const renderWeek = (weekData: WeekData, isArchive: boolean) => {
    const title = isArchive ? "Aktuelle Woche (Archiv)" : "Nächste Woche";
    const grandTotal = calculateGrandTotal(weekData.orders);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: isArchive ? "#666" : "#333", margin: 0 }}>🍴 {title}</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => exportWeekAsText(weekData, title)} style={{ ...btnStyle, backgroundColor: "#6c757d" }}>📄 Text Export</button>
            <button onClick={() => exportWeekAsCSV(weekData, title)} style={{ ...btnStyle, backgroundColor: "#28a745" }}>📊 CSV/Excel Export</button>
          </div>
        </div>

        {daysOfWeek.map(day => (
          <div key={day} style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "#fff" }}>
            <h3 style={{ borderBottom: "2px solid #eee", marginTop: 0 }}>{day}</h3>
            
            <div style={{ marginBottom: "10px" }}>
              <strong>Angebot:</strong>
              {weekData.meals[day]?.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95em" }}>
                  <span>#{m.number} - {m.name} ({m.price}€)</span>
                  {!isArchive && (
                    <button onClick={() => removeMealTemplate(day, i)} style={{ border: "none", background: "none", color: "red", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: "#fcfcfc", padding: "10px", borderRadius: "5px" }}>
              <strong>Bestellungen:</strong>
              <ul style={{ listStyle: "none", padding: "5px 0", margin: 0 }}>
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

        <div style={{ background: "#e9ecef", padding: "20px", borderRadius: "8px", marginTop: "30px" }}>
          <h3>💰 Abrechnung</h3>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <th>Name</th><th>Tage</th><th>Summe</th>{!isArchive && <th>Aktion</th>}
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
                      <button onClick={() => removeUserCompletely(person)} style={{ fontSize: "0.7em", backgroundColor: "#ffdfdf", border: "1px solid red", borderRadius: "3px", cursor: "pointer" }}>Entfernen</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#ddd" }}>
                <td colSpan={2} style={{ padding: "10px", fontWeight: "bold" }}>GESAMT</td>
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
        <div style={{ marginLeft: "auto", fontSize: "0.8em", color: isOnline ? "#28a745" : "#dc3545", fontWeight: "bold" }}>
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
              <button onClick={addOrder} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Speichern</button>
            </div>
          </div>
          <button onClick={resetWeek} style={{ marginTop: "50px", background: "#dc3545", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", width: "100%" }}>
            Woche abschließen & verschieben
          </button>
        </>
      ) : (
        data.previous ? renderWeek(data.previous, true) : <p style={{ textAlign: "center", color: "#999", marginTop: "50px" }}>Keine Daten im Archiv.</p>
      )}
    </div>
  );
}

// styles 
const navBtnStyle = (active: boolean) => ({
  padding: "10px 20px",
  backgroundColor: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: active ? ("bold" as const) : ("normal" as const)
});

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "1em" };
const btnStyle = { padding: "8px 12px", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold" as const };

function AddMealForm({ day, onAdd }: { day: string, onAdd: (day: string, meal: Meal) => void }) {
  const [n, setN] = useState(""); const [p, setP] = useState(""); const [num, setNum] = useState("");
  return (
    <div style={{ marginTop: "15px", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
      <span style={{ fontSize: "0.8em", color: "#666" }}>Menü hinzufügen:</span><br/>
      <input placeholder="Nr" size={2} value={num} onChange={e => setNum(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Name" value={n} onChange={e => setN(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Preis" size={4} value={p} onChange={e => setP(e.target.value)} />
      <button onClick={() => { if(!n||!p||!num) return; onAdd(day, { name: n, price: p, number: num }); setN(""); setP(""); setNum(""); }}>+</button>
    </div>
  );
}
