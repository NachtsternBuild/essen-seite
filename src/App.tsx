import { useState, useEffect, useMemo } from 'react';
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

interface User {
  id?: string;
  token_hash: string;
  name: string;
  is_admin: boolean;
  is_superuser?: boolean;
}

// generate hash token
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// config the site
const pb = new PocketBase(import.meta.env.DEV ? 'http://127.0.0.1:8090' : undefined);
const COLLECTION_NAME = 'meals_data';
const USER_COLLECTION = 'users';
const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

// function to create the weekly meal planner
export default function WeeklyMealPlanner() {
  const [view, setView] = useState<"current" | "archive" | "users">("current");
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem("meal_planner_data");
    return saved ? JSON.parse(saved) : { current: { meals: {}, orders: {} }, previous: null };
  });

  const [token, setToken] = useState(localStorage.getItem("user_token") || "");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  // get the user based on the token
  const [hashedToken, setHashedToken] = useState<string>("");

  // hashing the plaintext token
  useEffect(() => {
    const updateHash = async () => {
      if (token) {
        const h = await hashToken(token);
        setHashedToken(h);
      } else {
        setHashedToken("");
      }
    };
    updateHash();
  }, [token]);

  // find the user by the hash
  const currentUser = useMemo(() => 
    allUsers.find(u => u.token_hash === hashedToken), 
    [hashedToken, allUsers]
  );

  // init & data sync
  const fetchUsers = async () => {
    try {
      const users = await pb.collection(USER_COLLECTION).getFullList<User>();
      setAllUsers(users);
    } catch (err) { console.error("User-Laden fehlgeschlagen", err); }
  };

  useEffect(() => {
    async function init() {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        if (record.content) {
          setData(record.content);
          localStorage.setItem("meal_planner_data", JSON.stringify(record.content));
        }
        await fetchUsers();
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    }
    init();
  }, []);

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
        } catch (err) { setIsOnline(false); }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  // authorizations
  const checkAuth = (targetName?: string, requiredRole: 'user' | 'admin' | 'superuser' = 'user') => {
    if (!currentUser) {
      alert("Bitte einloggen!");
      return false;
    }

    // superuser can do everything
    if (currentUser.is_superuser) return true;

    // if admin required
    if (requiredRole === 'admin' && (currentUser.is_admin || currentUser.is_superuser)) return true;

    // if specific access to another user's data is required
    if (targetName && currentUser.name !== targetName && !currentUser.is_admin && !currentUser.is_superuser) {
      alert("Keine Berechtigung!");
      return false;
    }

    return true;
  };
  
  // function to reset the user tokens
  const resetUserToken = async (userId: string | undefined, newRawToken: string) => {
    if (!userId) return; // if there is no ID return
    if (!checkAuth(undefined, 'superuser')) return;

    try {
      const newHash = await hashToken(newRawToken);
      await pb.collection(USER_COLLECTION).update(userId, { token_hash: newHash });
      alert("Token wurde erfolgreich zurückgesetzt.");
    } catch (e) {
      alert("Fehler beim Zurücksetzen.");
    }
  };
  

  // add a meal to a list
  const addMeal = (day: string, meal: Meal) => {
    if (!checkAuth(undefined, 'admin')) return;
    setData(prev => ({
      ...prev,
      current: { ...prev.current, meals: { ...prev.current.meals, [day]: [...(prev.current.meals[day] || []), meal] } }
    }));
  };
  
  // remove the meal from the list
  const removeMealTemplate = (day: string, index: number) => {
    if (!checkAuth(undefined, 'admin')) return;
    setData(prev => {
      const mealToDelete = prev.current.meals[day]?.[index];
      if (!mealToDelete) return prev;
      const newMeals = { ...prev.current.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      const newOrders = { ...prev.current.orders };
      Object.keys(newOrders).forEach(person => {
        const userOrders = { ...newOrders[person] };
        if (userOrders[day] && userOrders[day].number === mealToDelete.number) delete userOrders[day];
        if (Object.keys(userOrders).length === 0) delete newOrders[person];
        else newOrders[person] = userOrders;
      });
      return { ...prev, current: { ...prev.current, meals: newMeals, orders: newOrders } };
    });
  };

  // function to add orders
  const addOrder = (day: string, mealNumber: string) => {
    if (!currentUser || !checkAuth(currentUser.name)) return;
    const meal = data.current.meals[day]?.find(m => m.number === mealNumber);
    if (!meal) return alert("Menü-Nummer existiert nicht!");

    setData(prev => ({
      ...prev,
      current: {
        ...prev.current,
        orders: {
          ...prev.current.orders,
          [currentUser.name]: { ...(prev.current.orders[currentUser.name] || {}), [day]: meal }
        }
      }
    }));
  };
  
  // function to remove a single order
  const removeSingleOrder = (person: string, day: string) => {
    if (!checkAuth(person)) return;
    setData(prev => {
      const newUserOrders = { ...prev.current.orders[person] };
      delete newUserOrders[day];
      const newOrders = { ...prev.current.orders };
      if (Object.keys(newUserOrders).length === 0) delete newOrders[person];
      else newOrders[person] = newUserOrders;
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };
  
  // remove all orders from a user
  const removeUserCompletely = (person: string) => {
    if (!checkAuth(person)) return;
    if (!confirm(`${person} wirklich löschen?`)) return;
    setData(prev => {
      const newOrders = { ...prev.current.orders };
      delete newOrders[person];
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };
  
  // function to reset a week and put the week to the archive
  const resetWeek = () => {
    if (!checkAuth(undefined, 'admin')) return;
    if (!confirm("Wochenplanung abschließen?")) return;
    setData(prev => ({ previous: prev.current, current: { meals: {}, orders: {} } }));
  };

  // function to create a user
  const createUser = async (u: { name: string, token: string, is_admin: boolean }) => {
    if (!checkAuth(undefined, 'admin')) return;
    try {
      // hash the token
      const secureHash = await hashToken(u.token);
    
      await pb.collection(USER_COLLECTION).create({
        name: u.name,
        token_hash: secureHash,
        is_admin: u.is_admin
      });
    
      await fetchUsers();
      alert("Nutzer erfolgreich angelegt.");
    } catch (e) { 
      alert("Fehler beim Erstellen (Token-Hash schon vergeben?)"); 
    }
  };
 
  // function to delete a user
  const deleteUserRecord = async (id: string) => {
    if (!checkAuth(undefined, 'admin')) return;
    
    // find the user in the local list to check their status
    const userToDelete = allUsers.find(u => u.id === id);
	
	// superuser has the permission to delete all user
	if (!checkAuth(undefined, 'superuser')) {
    	if (userToDelete?.is_admin) {
          // admins cannot delete each other
          alert("Administratoren können nicht gelöscht werden.");
          return;
    	}
    }
	
    if (!confirm(`Möchten Sie den Zugang für ${userToDelete?.name} wirklich permanent löschen?`)) return;

    try {
      await pb.collection(USER_COLLECTION).delete(id);
      await fetchUsers();
    } catch (e) { 
      alert("Löschen fehlgeschlagen."); 
    }
  };
  
  // function to export the week as CSV
  const exportAsCSV = (weekData: WeekData, title: string) => {
    let csvContent = "Name;Anzahl;Summe;Details\n";
    
    Object.entries(weekData.orders).forEach(([person, orders]) => {
      const total = calculateUserTotal(orders).toFixed(2);
      const count = Object.keys(orders).length;
      const details = Object.entries(orders)
        .map(([day, meal]) => `${day}: #${meal.number}`)
        .join(" | ");
      
      csvContent += `${person};${count};${total} €;"${details}"\n`;
    });

    const totalSum = Object.values(weekData.orders)
      .reduce((sum, o) => sum + calculateUserTotal(o), 0).toFixed(2);
    csvContent += `\nGESAMT;;${totalSum} €;`;

    downloadFile(csvContent, `Abrechnung_${title}.csv`, "text/csv;charset=utf-8;");
  };
  
  // function to export the week as text file
  const exportAsTXT = (weekData: WeekData, title: string) => {
    let txt = `ABRECHNUNG: ${title.toUpperCase()}\n`;
    txt += "=".repeat(40) + "\n\n";

    Object.entries(weekData.orders).forEach(([person, orders]) => {
      txt += `${person.padEnd(15)} | ${Object.keys(orders).length} Essen | Summe: ${calculateUserTotal(orders).toFixed(2)} €\n`;
      Object.entries(orders).forEach(([day, meal]) => {
        txt += `  - ${day}: #${meal.number} (${meal.name})\n`;
      });
      txt += "-".repeat(40) + "\n";
    });

    const totalSum = Object.values(weekData.orders)
      .reduce((sum, o) => sum + calculateUserTotal(o), 0).toFixed(2);
    txt += `\nGESAMTSUMME: ${totalSum} €`;

    downloadFile(txt, `Abrechnung_${title}.txt`, "text/plain;charset=utf-8;");
  };
  
  // function to download files
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // calculate user bill
  const calculateUserTotal = (userOrders: { [day: string]: Meal }) => 
    Object.values(userOrders).reduce((sum, m) => sum + parseFloat(String(m.price).replace(',', '.')), 0);

  // layout the week menu layout
  const renderWeekContent = (weekData: WeekData, isArchive: boolean) => (
    <div>
      {daysOfWeek.map(day => {
        const summary: { [num: string]: number } = {};
        Object.values(weekData.orders).forEach(o => { if (o[day]) summary[o[day].number] = (summary[o[day].number] || 0) + 1; });

        return (
          <div key={day} style={cardStyle}>
            {/* the main menu layout */}
            <h3 style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: "5px" }}>{day}</h3>
            <div style={{ marginBottom: "10px" }}>
              <strong>Speisekarte:</strong>
              {weekData.meals[day]?.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>Menü #{m.number} - {m.name} ({m.price}€)</span>
                  {!isArchive && currentUser?.is_admin && (
                    <button onClick={() => removeMealTemplate(day, i)} style={textBtnStyle}>✕</button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Menulist */}
            {Object.keys(summary).length > 0 && (
              <div style={summaryBoxStyle}>
                {Object.entries(summary).sort().map(([num, count]) => (
                  <span key={num} style={badgeStyle}>Menü #{num}: {count} x</span>
                ))}
              </div>
            )}
            
            {/* all orders for the day */}
            <div style={{ marginTop: "10px" }}>
              <strong>Bestellungen:</strong>
              {Object.entries(weekData.orders).map(([person, days]) => days[day] && (
                <div key={person} style={{ fontSize: "0.9em", display: "flex", gap: "10px", alignItems: "center" }}>
                  {!isArchive && (person === currentUser?.name || currentUser?.is_admin) && (
                    <button onClick={() => removeSingleOrder(person, day)} style={textBtnStyle}>✕</button>
                  )}
                  <span>{person}: <b>#{days[day].number}</b></span>
                </div>
              ))}
            </div>
            {!isArchive && currentUser?.is_admin && <AddMealForm day={day} onAdd={addMeal} />}
          </div>
        );
      })}
      
      {/* the bill */}
      <div style={{ ...cardStyle }}>
        <h3>💰 Abrechnung</h3>
        <div style={{ display: "flex", gap: "20px", paddingBottom: "20px" }}>
      	  <button onClick={() => exportAsTXT(weekData, isArchive ? "Archiv" : "Aktuelle_Woche")} 
        	style={{ ...smallBtn, backgroundColor: "#6c757d" }}>📄 TXT Export</button>
      	  <button onClick={() => exportAsCSV(weekData, isArchive ? "Archiv" : "Aktuelle_Woche")} 
      		style={{ ...smallBtn, backgroundColor: "#28a745" }}>📊 CSV Export</button>
      	</div>
      	{/* per user */} 
        <table style={{ width: "100%", textAlign: "left" }}>
          <thead><tr><th>Name</th><th>Anzahl</th><th>Summe</th><th></th></tr></thead>
          <tbody>
            {Object.entries(weekData.orders).map(([person, userOrders]) => (
              <tr key={person}>
                <td>{person}</td>
                <td>{Object.keys(userOrders).length}x</td>
                <td><b>{calculateUserTotal(userOrders).toFixed(2)} €</b></td>
                <td style={{ textAlign: "right" }}>
                  {!isArchive && (person === currentUser?.name || currentUser?.is_admin) && (
                    <button onClick={() => removeUserCompletely(person)} style={smallDeleteBtn}>Nutzerbestellungen löschen</button>
                  )}
                </td>
               
              </tr>
            ))}
          </tbody>
          {/* full total */}
          <tfoot style={{ borderTop: "2px solid #333" }}>
      		<tr>
        	  <td style={{ paddingTop: "20px" }}><strong>GESAMTSUMME: </strong></td>
        	  <td style={{ paddingTop: "20px" }}>
          	    <strong>
                {Object.values(weekData.orders).reduce((total, orders) => total + Object.keys(orders).length, 0)}x
           	    </strong>
        	  </td>
        	  <td style={{ paddingTop: "10px" }}>
          	    <strong style={{ fontSize: "1.1em", color: "#28a745" }}>
                {Object.values(weekData.orders)
                  .reduce((total, orders) => total + calculateUserTotal(orders), 0)
                  .toFixed(2)} €
          	    </strong>
        	  </td>
        	  <td></td>       	    
      		  </tr>
    		</tfoot>
        </table>
      </div>
    </div>
  );
  
  // layout header and navigation
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif", color: "var(--text-color)" }}>
      <div style={headerStyle}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <strong>Token:</strong>
          {/* token and password layout */}
          <input 
            type="password" 
            value={token} 
            onChange={e => { setToken(e.target.value); localStorage.setItem("user_token", e.target.value); }} 
            style={inputStyle}
            placeholder="Token eingeben..." 
          />
          {currentUser ? <span style={{ color: "#007bff", padding: 20 }}>● {currentUser.name} {currentUser.is_admin && "(Admin)"}</span> : <span style={{ color: "#007bff" }}>○ Kein Zugriff</span>}
        </div>
        <div style={{ padding: 20, marginLeft: "auto", fontSize: "0.8em", color: isOnline ? "#28a745" : "#dc3545", fontWeight: "bold" }}>
          {isOnline ? "● Server verbunden" : "○ Offline"}
        </div>
      </div>
      
      {/* navigation bar */}
      <nav style={{ marginBottom: "25px", display: "flex", gap: "10px" }}>
        <button onClick={() => setView("current")} style={navBtnStyle(view === "current")}>Planung</button>
        <button onClick={() => setView("archive")} style={navBtnStyle(view === "archive")}>Aktuelle Woche</button>
        {currentUser?.is_admin && (
          <button onClick={() => setView("users")} style={navBtnStyle(view === "users", "#ffc107")}>Benutzer</button>
        )}
      </nav>
	  {view === "users" && currentUser?.is_admin ? (
        <UserManagement 
    	users={allUsers} 
   		onCreate={createUser} 
    	onDelete={deleteUserRecord} 
    	onResetToken={resetUserToken} 
    	currentSuperuser={currentUser?.is_superuser}
  		/> ) : view === "current" ? (
        <>
          {renderWeekContent(data.current, false)}
          <OrderForm days={daysOfWeek} onOrder={addOrder} currentUser={currentUser} />
          {currentUser?.is_admin && (
            <button onClick={resetWeek} style={resetBtnStyle}>Wochenplanung beenden</button>
          )}
        </>
      ) : (
        data.previous ? renderWeekContent(data.previous, true) : <p style={{ textAlign: "center", color: "#8B0000" }}>Keine Daten im Archiv.</p>
      )}
    </div>
  );
}

// layout ordering a menu
function OrderForm({ days, onOrder, currentUser }: any) {
  const [day, setDay] = useState(days[0]);
  const [nr, setNr] = useState("");
  if (!currentUser) return null;

  return (
    <div style={{ border: "2px solid #007bff", padding: "20px", marginTop: "30px", borderRadius: "10px"}}>
      <h3 style={{ marginTop: 0 }}>Essen bestellen</h3>
      <p>Bestellen für: <b>{currentUser.name}</b></p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select value={day} onChange={e => setDay(e.target.value)} style={inputStyle}>
          {days.map((d: string) => <option key={d}>{d}</option>)}
        </select>
        <input placeholder="Menü Nr." value={nr} onChange={e => setNr(e.target.value)} style={inputStyle} />
        <button onClick={() => { onOrder(day, nr); setNr(""); }} style={blueBtn}>Bestellen</button>
      </div>
    </div>
  );
}

// layout for user management
function UserManagement({ users, onCreate, onDelete, onResetToken, currentSuperuser }: {
  users: User[],
  onCreate: (u: any) => void,
  onDelete: (id: string) => void,
  onResetToken: (id: string | undefined, token: string) => void,
  currentSuperuser: boolean | undefined
}) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [adm, setAdm] = useState(false);
  
  return (
    <div style={cardStyle}>
      <h3>👥 Benutzerverwaltung</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Token" value={token} onChange={e => setToken(e.target.value)} style={inputStyle} />
        <label><input type="checkbox" checked={adm} onChange={e => setAdm(e.target.checked)} /> Admin</label>
		<button onClick={() => { 
			onCreate({ name, token: token, is_admin: adm });
  			setName(""); setToken(""); setAdm(false); 
			}} style={greenBtn}>Hinzufügen</button>
      </div>
      <table style={{ width: "100%", textAlign: "left" }}>
        <thead><tr><th>Name</th><th>Status</th><th>Aktion</th></tr></thead>
        <tbody>
          {users.map((u: User) => (
            <tr key={u.id}>
              <td>
                {u.name} 

              </td>
              <td>
                {u.is_superuser ? "Superuser" : u.is_admin ? "Admin" : "User"}
              </td>
              <td>
                <div style={{ display: "flex", gap: "10px" }}>
                  
                  {!u.is_admin && !u.is_superuser && (
                    <button onClick={() => u.id && onDelete(u.id)} style={textBtnStyle}>Löschen</button>
                  )}
                  
                  {currentSuperuser && !u.is_superuser && (
                    <button onClick={() => u.id && onDelete(u.id)} style={textBtnStyle}>Löschen</button>
                  )}                  
                  {currentSuperuser && (
                    <button onClick={() => {
                        const newT = prompt(`Neuen Token für ${u.name} eingeben:`);
                        if (newT) onResetToken(u.id, newT);
                      }}
                      style={{ ...smallDeleteBtn, borderColor: "#007bff", color: "#007bff" }}>Token Reset</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// layout to add a meal to the list
function AddMealForm({ day, onAdd }: { day: string, onAdd: (day: string, meal: Meal) => void }) {
  const [n, setN] = useState(""); const [p, setP] = useState(""); const [num, setNum] = useState("");
  return (
    <div style={{ marginTop: "15px", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
      <input placeholder="Nr" size={2} value={num} onChange={e => setNum(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Gericht" value={n} onChange={e => setN(e.target.value)} style={{ marginRight: "5px" }} />
      <input placeholder="Preis" size={4} value={p} onChange={e => setP(e.target.value)} />
      <button onClick={() => { if(n&&p&&num) { onAdd(day, { name: n, price: p, number: num }); setN(""); setP(""); setNum(""); } }}>+</button>
    </div>
  );
}

// style
const headerStyle = { 
  padding: "15px", 
  borderRadius: "8px", 
  marginBottom: "20px", 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  border: "1px solid #ddd" 
};

const cardStyle = { 
  border: "1px solid var(--border-color)", 
  backgroundColor: "var(--card-bg)",
  padding: "15px", 
  marginBottom: "20px", 
  borderRadius: "8px", 
  color: "var(--text-color)"
};

const navBtnStyle = (active: boolean, activeColor = "#333") => ({ 
  padding: "10px 20px", 
  backgroundColor: active ? activeColor : "#eee", 
  color: active ? "#fff" : "#333", 
  border: "none", 
  borderRadius: "5px", 
  cursor: "pointer", 
  fontWeight: "bold" as const 
});

const inputStyle = { 
  padding: "8px", 
  borderRadius: "5px", 
  border: "1px solid var(--border-color)", 
  backgoundColor: "var(--input-bg)",
  color: "var(--text-color)"
};

const summaryBoxStyle = { 
  display: "flex", 
  gap: "10px", 
  margin: "10px 0", 
  flexWrap: "wrap" as const 
};

const badgeStyle = { 
  backgroundColor: "#8B0000", 
  color: "white", 
  padding: "2px 8px", 
  borderRadius: "12px", 
  fontSize: "0.85em" 
};

const blueBtn = { 
  padding: "10px 20px", 
  backgroundColor: "#007bff", 
  color: "white", 
  border: "none", 
  borderRadius: "5px", 
  cursor: "pointer" 
};

const greenBtn = { 
  padding: "8px 15px", 
  backgroundColor: "#28a745", 
  color: "white", 
  border: "none", 
  borderRadius: "5px", 
  cursor: "pointer" 
};

const resetBtnStyle = { 
  marginTop: "30px", 
  backgroundColor: "#dc3545", 
  color: "white", 
  border: "none", 
  padding: "12px", 
  borderRadius: "5px", 
  width: "100%", 
  cursor: "pointer", 
  fontWeight: "bold" as const 
};

const textBtnStyle = { 
  color: "red", 
  border: "none", 
  background: "none", 
  cursor: "pointer" 
};

const smallDeleteBtn = { 
  fontSize: "0.75em", 
  color: "#dc3545", 
  border: "1px solid #dc3545", 
  borderRadius: "3px", 
  background: "none", 
  cursor: "pointer" 
};

const smallBtn = { 
  padding: "5px 10px", 
  color: "white", 
  border: "none", 
  borderRadius: "4px", 
  cursor: "pointer", 
  fontSize: "0.9em",
  fontWeight: "bold" as const 
};
