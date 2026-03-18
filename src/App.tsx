import { useState, useEffect, useMemo } from 'react';
import PocketBase from 'pocketbase';
import { sha256 } from 'js-sha256';
import './App.css';

// typedefinition
interface Meal {
  name: string;
  price: string | number;
  number: string;
  edited?: boolean; 
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
  upcoming: WeekData;  
  current: WeekData;  
  previous: WeekData | null; 
  maintenance_active?: boolean;
  maintenance_start?: string;
  maintenance_duration?: string;
}

interface User {
  id?: string;
  token_hash: string;
  name: string;
  is_admin: boolean;
  is_superuser?: boolean;
  info?: string;
}

// generate hash token
async function hashToken(token: string): Promise<string> {
  return sha256(token); 
}

// config the site
const pb = new PocketBase(import.meta.env.DEV ? 'http://127.0.0.1:8090' : undefined);
const COLLECTION_NAME = 'meals_data';
const USER_COLLECTION = 'users';
const daysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

// function to create the weekly meal planner
export default function WeeklyMealPlanner() {
  const [view, setView] = useState<"current" | "archive" | "users" | "upcoming">("current");
  // Initialer State im useState:
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem("meal_planner_data");
    return saved ? JSON.parse(saved) : { 
      upcoming: { meals: {}, orders: {} }, 
      current: { meals: {}, orders: {} }, 
      previous: null,
      maintenance_active: false,
      maintenance_start: "",
      maintenance_duration: ""
    };
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
  		  setData({
            ...record.content, // Dies lädt automatisch auch maintenance_active etc.
            upcoming: record.content.upcoming || { meals: {}, orders: {} },
            current: record.content.current || { meals: {}, orders: {} },
            previous: record.content.previous || null
          });
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
  
  // function if you can modify the day
  const isLocked = (day: string) => {
    const now = new Date();
    const daysMap: { [key: string]: number } = { "Montag": 1, "Dienstag": 2, "Mittwoch": 3, "Donnerstag": 4, "Freitag": 5 };
    const targetDayNum = daysMap[day];
    const currentDayNum = now.getDay(); // 0 = So, 1 = Mo...

    // the day passed away
    if (currentDayNum > targetDayNum) return true;

    // if the day is today
    if (currentDayNum === targetDayNum) {
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (hours > 8 || (hours === 8 && minutes >= 30)) return true;
    }
  
    // at Sa/So the block the full week
    if (currentDayNum === 0 || currentDayNum === 6) return true;

    return false;
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
  // Rotation: Planung -> Aktuell -> Vorwoche
  const resetWeek = () => {
    if (!checkAuth(undefined, 'admin')) return;
    if (!confirm("Planung abschließen?")) return;

    setData(prev => ({
      previous: prev.current,      // active week to previous
      current: prev.upcoming,      // upcoming week to previous week
      upcoming: { meals: {}, orders: {} } // new empty week
    }));
  };

  // update orders in the active week
  const updateCurrentOrder = (day: string, mealNumber: string) => {
    if (!currentUser) return;
    if (isLocked(day)) return alert("Nach 08:30 Uhr sind keine Änderungen für heute mehr möglich!");

    setData(prev => {
      const meal = prev.current.meals[day]?.find(m => m.number === mealNumber);
      if (!meal) return prev;

      return {
        ...prev,
        current: {
          ...prev.current,
          orders: {
            ...prev.current.orders,
            [currentUser.name]: { 
              ...(prev.current.orders[currentUser.name] || {}), 
              [day]: { ...meal, edited: true } // Markierung hinzufügen
            }
          }
        }
      };
    });
  };

  // function to create a user
  const createUser = async (u: { name: string, token: string, is_admin: boolean, info?: string }) => {
    if (!checkAuth(undefined, 'admin')) return;
    try {
      // hash the token
      const secureHash = await hashToken(u.token);
    
      await pb.collection(USER_COLLECTION).create({
        name: u.name,
        token_hash: secureHash,
        is_admin: u.is_admin,
        info: u.info
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
  
  // function to add orders in the upcoming week
  const addUpcomingOrder = (day: string, mealNumber: string) => {
    if (!currentUser || !checkAuth(currentUser.name)) return;
  
    const meal = data.upcoming.meals[day]?.find(m => m.number === mealNumber);
    if (!meal) return alert("Menü-Nummer in der Planung nicht gefunden!");

    setData(prev => ({
      ...prev,
      upcoming: {
        ...prev.upcoming,
        orders: {
          ...prev.upcoming.orders,
          [currentUser.name]: { ...(prev.upcoming.orders[currentUser.name] || {}), [day]: meal }
        }
      }
    }));
  };

  // function to add meals for the next week
  const addUpcomingMeal = (day: string, meal: Meal) => {
    if (!checkAuth(undefined, 'admin')) return;
    setData(prev => ({
      ...prev,
      upcoming: { 
        ...prev.upcoming, 
        meals: { ...prev.upcoming.meals, [day]: [...(prev.upcoming.meals[day] || []), meal] } 
      }
    }));
  };
  
  // function to remove a meal for upcoming week
  const removeUpcomingMealTemplate = (day: string, index: number) => {
    if (!checkAuth(undefined, 'admin')) return;
    setData(prev => {
      const newMeals = { ...prev.upcoming.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      return { ...prev, upcoming: { ...prev.upcoming, meals: newMeals } };
    });
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
  
  // function to export as pdf file
  const exportAsPDF = async (weekData: WeekData, title: string) => {

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text(`Abrechnung: ${title.replace('_', ' ')}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Erstellt am: ${dateStr}`, 14, 28);

    const tableRows = Object.entries(weekData.orders).map(([person, orders]) => {
      const total = calculateUserTotal(orders).toFixed(2);
      const count = Object.keys(orders).length;

      const details = Object.entries(orders)
        .map(([day, meal]) => `${day}: #${meal.number}`)
        .join(", ");

      return [person, `${count}x`, `${total} €`, details];
    });

    const totalSum = Object.values(weekData.orders)
      .reduce((sum, o) => sum + calculateUserTotal(o), 0)
      .toFixed(2);

    autoTable(doc, {
      startY: 35,
      head: [['Name', 'Anzahl', 'Summe', 'Details']],
      body: tableRows,
      foot: [['GESAMT', '', `${totalSum} €`, '']],
      theme: 'striped',
      styles: { fontSize: 10 },
    });

    doc.save(`Abrechnung_${title}.pdf`);
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
  
  // create maintenance infos 
  const maintenanceInfo = useMemo(() => {
    if (!data.maintenance_active || !data.maintenance_start) return null;
    const start = new Date(data.maintenance_start);
    const now = new Date();
    const diffHours = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      hoursUntil: diffHours,
      duration: data.maintenance_duration || "unbekannt",
      isUrgent: diffHours <= 2 && diffHours >= 0
    };
  }, [data.maintenance_active, data.maintenance_start, data.maintenance_duration]);

  // function to save the maintenance infos
  const updateMaintenance = (active: boolean, start?: string, duration?: string) => {
    setData(prev => ({
      ...prev,
      maintenance_active: active,
      maintenance_start: start ?? prev.maintenance_start,
      maintenance_duration: duration ?? prev.maintenance_duration
    }));
  };
  
  // function additional infos
  const updateUserField = async (userId: string | undefined, field: string, value: any) => {
    if (!userId) return;
    if (!checkAuth(undefined, 'superuser')) return; 

    try {
      await pb.collection(USER_COLLECTION).update(userId, { [field]: value });
      await fetchUsers(); // reload user list
    } catch (e) {
      alert("Fehler beim Aktualisieren der Benutzerdaten.");
    } 
  };
  
  // calculate user bill
  const calculateUserTotal = (userOrders: { [day: string]: Meal }) => 
    Object.values(userOrders).reduce((sum, m) => sum + parseFloat(String(m.price).replace(',', '.')), 0);

  // layout the week menu layout
  const renderWeekContent = (
  weekData: WeekData, 
  isArchive: boolean, 
  isUpcoming: boolean,
  onAddMeal?: (day: string, meal: Meal) => void, 
  onRemoveMeal?: (day: string, index: number) => void 
  ) => (
  <div>
    {daysOfWeek.map(day => {
      const summary: { [num: string]: number } = {};
      Object.values(weekData.orders).forEach(o => { if (o[day]) summary[o[day].number] = (summary[o[day].number] || 0) + 1; });
	  	  
	  const dayIsLocked = isUpcoming ? isLocked(day) : false;
	  
      return (
        <div key={day} style={{ ...cardStyle, opacity: (isLocked(day) && !isArchive && view === "current") ? 0.8 : 1 }}>
          <h3 style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: "5px" }}>
            {day} {dayIsLocked && view === "current" && "🔒"}
          </h3>
          <div style={{ marginBottom: "10px" }}>
            <strong>Speisekarte:</strong>
            {weekData.meals[day]
  			  ?.slice() // create a copy so as not to modify the original state directly
  			  .sort((a, b) => parseInt(a.number) - parseInt(b.number)) // sort numerically
  			  .map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span>Menü #{m.number} - {m.name} ({m.price}€)</span>
                {/* delete only if not archived, admin is and time has not expired */}
                {!isArchive && currentUser?.is_admin && !dayIsLocked && (
                  <button onClick={() => onRemoveMeal?.(day, i)} style={textBtnStyle}>✕</button>
                )}
              </div>
            ))}
          </div>
                    
            {/* Menulist */}
            {Object.keys(summary).length > 0 && (
              <div style={summaryBoxStyle}>
                {Object.entries(summary).sort().map(([num, count]) => (
                  <span key={num} style={badgeStyle}>{count} Mal Menü #{num}</span>
                ))}
              </div>
            )}
            
            {/* all orders for the day */}
            <div style={{ marginTop: "10px" }}>
            <strong>Bestellungen:</strong>
            {Object.entries(weekData.orders).map(([person, days]) => {
    		  const order = days[day];
    		  if (!order) return null;

    		  return (
      			<div key={person} style={order.edited ? editedOrderRowStyle : normalOrderRowStyle}>
        		  {!isArchive && !dayIsLocked && (person === currentUser?.name || currentUser?.is_admin) && (
          		    <button onClick={() => removeSingleOrder(person, day)} style={textBtnStyle}>✕</button>
        		  )}
        		  <span>
  					{person} {allUsers.find(u => u.name === person)?.info && 
    				<small style={{ color: "#666" }}> 
    				  ({allUsers.find(u => u.name === person)?.info})
    				</small>
  					}: <b>#{order.number}</b> {order.name}
				  </span>
      			</div>
    		  );
  			})}
          </div>

          {/* only show form if not locked */}
          {!isArchive && currentUser?.is_admin && !dayIsLocked && (
            <AddMealForm day={day} onAdd={onAddMeal || (() => {})} />
          )}
        </div>
        );
      })}
      
      {/* the bill */}
      <div style={{ ...cardStyle }}>
        <h3>💰 Abrechnung</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", paddingBottom: "20px" }}>
        
      	  <button onClick={() => exportAsTXT(weekData, isArchive ? "Archiv" : "Aktuelle_Woche")} 
        	style={{ ...greyBtn }}>📄 TXT Export</button>
      	  <button onClick={() => exportAsCSV(weekData, isArchive ? "Archiv" : "Aktuelle_Woche")} 
      		style={{ ...greenBtn }}>📊 CSV Export</button>
      	  <button onClick={() => exportAsPDF(weekData, isArchive ? "Archiv" : "Aktuelle_Woche")} 
            style={{ ...redBtn }}>📋 PDF Export</button>
      	</div>
      	{/* per user */} 
        <table style={{ 
  		  width: "100%", 
  		  textAlign: "left", 
  		  borderCollapse: "separate",
  		  borderSpacing: "0 5px" }}>
          <thead><tr><th>Name</th><th>Info</th><th>Anzahl</th><th>Summe</th><th></th></tr></thead>
          <tbody>
            {Object.entries(weekData.orders).map(([person, userOrders]) => {
  			  const hasBeenEdited = Object.values(userOrders).some(m => m.edited === true);
  			  // get the extra user info
        	  const userDetail = allUsers.find(u => u.name === person);

  			  return (
  			    <tr key={person}>
      			  <td style={{ 
            		padding: "15px", 
            		backgroundColor: "var(--card-bg)",
            		borderTopLeftRadius: "12px", 
            		borderBottomLeftRadius: "12px",
            		borderTop: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
            		borderBottom: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
            		borderLeft: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)" }}>
        			{person} {hasBeenEdited && <small>(geändert)</small>}
      			  </td>
      			  
            	  <td style={{ 
                	padding: "15px", 
                	backgroundColor: "var(--card-bg)",
                	color: "#666",
                	fontSize: "0.9em",
                	borderTop: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
                	borderBottom: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)" 
            	  }}>
              		{userDetail?.info || "-"}
            	  </td>
      			  
      			  <td style={{ 
            		padding: "15px", 
            		backgroundColor: "var(--card-bg)",
            		borderTop: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
            		borderBottom: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)" }}>
      			    {Object.keys(userOrders).length}x
      			  </td>
      			  
      			  <td style={{ 
            		padding: "15px", 
            		backgroundColor: "var(--card-bg)",
            		borderTopRightRadius: "12px", 
            		borderBottomRightRadius: "12px",
            		borderTop: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
            		borderBottom: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)",
            		borderRight: hasBeenEdited ? "3px solid #ffc107" : "3px solid var(--border-color)" }}>
      			    <b>{calculateUserTotal(userOrders).toFixed(2)} €</b>
      			  </td>
      			  
      			  <td style={{ 
      				textAlign: "right", 
      				paddingLeft: "15px", 
      				width: "1%", 
      				whiteSpace: "nowrap" }}>
        			{!isArchive && (person === currentUser?.name || currentUser?.is_admin) && (
          			  <button onClick={() => removeUserCompletely(person)} style={smallDeleteBtn}>Nutzerbestellungen löschen</button>
        			)}
      			  </td>
    			</tr>
  			  );
			})}
          </tbody>
          {/* full total */}
          <tfoot style={{ borderTop: "2px solid #333" }}>
      		<tr>
        	  <td style={{ paddingTop: "20px", fontSize: "1.15em" }}><strong>GESAMTSUMME: </strong></td>
        	  <td style={{ paddingTop: "20px", fontSize: "1.15em" }}><strong>  </strong></td>
        	  <td style={{ paddingTop: "20px", fontSize: "1.15em" }}>
          	    <strong>
                {Object.values(weekData.orders).reduce((total, orders) => total + Object.keys(orders).length, 0)}x
           	    </strong>
        	  </td>
        	  <td style={{ paddingTop: "20px", fontSize: "1.15em" }}>
          	    <strong style={{ color: "#28a745" }}>
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
    {/* maintenance banner */}
      {maintenanceInfo && (
        <div style={{
          border: "5px solid",
          borderColor: maintenanceInfo.isUrgent ? "#dc3545" : "#ffc107",
          background: "none",
          padding: "15px", 
          textAlign: "center", 
          borderRadius: "12px", 
          marginBottom: "20px"
        }}>
          <p style={{ fontSize: "1.5em" }}>
            <strong>⚠️ WARTUNGSARBEITEN:</strong>
          </p> 
          <p>
            <strong>Beginn in:</strong> ca. {maintenanceInfo.hoursUntil} Stunden
          </p>
          <p>
            <strong>Dauer:</strong> ca. {maintenanceInfo.duration} Stunden
          </p>
        </div>
      )}
      <div style={headerStyle}>     
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <strong>Passwort:</strong>
          {/* token and password layout */}
          <input 
            type="password" 
            value={token} 
            onChange={e => { setToken(e.target.value); localStorage.setItem("user_token", e.target.value); }} 
            style={inputStyle}
            placeholder="Passwort eingeben..." 
          />
          {currentUser ? <span style={{ color: "#007bff", padding: 20 }}>● {currentUser.name} {currentUser.is_admin && "(Admin)"}</span> : <span style={{ color: "#007bff" }}>○ Kein Zugriff</span>}
        </div>
        <div style={{ padding: 20, marginLeft: "auto", fontSize: "0.8em", color: isOnline ? "#28a745" : "#dc3545", fontWeight: "bold" }}>
          {isOnline ? "● Server verbunden" : "○ Offline"}
        </div>
      </div>
      
      {/* navigation bar */}
      <nav style={{ marginBottom: "25px", display: "flex", gap: "7px" }}>
	    <button onClick={() => setView("upcoming")} style={navBtnStyle(view === "upcoming")}>Planung (Nächste Woche)</button>
  		<button onClick={() => setView("current")} style={navBtnStyle(view === "current")}>Aktuelle Woche</button>
  		<button onClick={() => setView("archive")} style={navBtnStyle(view === "archive")}>Vorwoche (Archiv)</button>
        {currentUser?.is_admin && (
          <button onClick={() => setView("users")} style={navBtnStyle(view === "users", "#ffc107")}>Benutzer</button>
        )}
      </nav>
	  {view === "users" && currentUser?.is_admin ? (
	  <>
        {/* superuser maintenance panel */}
    	{currentUser.is_superuser && (
      	  <div style={{ ...cardStyle, border: "3px solid #ffc107", background: "none" }}>
        	<h3>⚙️ Wartungssarbeitensteuerung</h3>
        	<p style= {{ fontSize: "1.1em" }}> 
        	Aktueller Status:
        	  <div style={{ color: data.maintenance_active ? "#28a745" : "#dc3545"}}>
          	  	  <b> {data.maintenance_active ? "● Aktiv" : "○ Inaktiv"}</b>
        	  </div>
        	</p>
         	<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          	  <input 
                type="datetime-local" 
                value={data.maintenance_start || ""} 
                onChange={e => updateMaintenance(data.maintenance_active || false, e.target.value)} 
                style={inputStyle} 
          	  />
          	  <input 
            	type="text" 
            	placeholder="Dauer (z.B. 2 Std)" 
            	value={data.maintenance_duration || ""} 
            	onChange={e => updateMaintenance(data.maintenance_active || false, undefined, e.target.value)} 
            	style={inputStyle} 
          	  />
              <button 
            	onClick={() => updateMaintenance(!data.maintenance_active)} 
            	style={data.maintenance_active ? redBtn : greenBtn}
          	  >
                {data.maintenance_active ? "Wartung beenden" : "Wartung starten"}
              </button>
             </div>
           </div>
        )}
          <UserManagement 
    	  users={allUsers} 
   		  onCreate={createUser} 
    	  onDelete={deleteUserRecord} 
    	  onResetToken={resetUserToken}
    	  onUpdateField={updateUserField} 
    	  currentSuperuser={currentUser?.is_superuser}
  		  />
  		</> 
  		) : view === "upcoming" ? (
  		<>
    	  {renderWeekContent(data.upcoming, false, false, addUpcomingMeal, removeUpcomingMealTemplate)}
    	  <OrderForm days={daysOfWeek} onOrder={addUpcomingOrder} currentUser={currentUser} allMeals={data.upcoming.meals} />
    	  {currentUser?.is_admin && <button onClick={resetWeek} style={resetBtnStyle}>Wochenplanung beenden</button>}
	  	</>
	  ) : view === "current" ? (
	 	<>
	      <div style={infoBannerStyle}>
	        <strong>
	          📌 Änderungen sind nur für zukünftige Tage oder heute vor 08:30 Uhr möglich.
	        </strong>
	      </div>
	      {renderWeekContent(data.current, false, true, addMeal, removeMealTemplate)}
	      <OrderForm days={daysOfWeek.filter(d => !isLocked(d))} 
  			onOrder={updateCurrentOrder} 
  			currentUser={currentUser} 
  			allMeals={data.current.meals}
		  />
	    </>
      ) : (
        data.previous ? renderWeekContent(data.previous, true, false) : <p style={{ textAlign: "center", color: "#8B0000" }}>Keine Daten im Archiv.</p>
      )}    
    </div>
  );
}

// layout ordering a menu
function OrderForm({ days, onOrder, currentUser, allMeals = {} }: any) {
  const [day, setDay] = useState(days[0]);
  const [nr, setNr] = useState("");

  const availableNumbers = useMemo(() => {
    const dayMeals = (allMeals && allMeals[day]) || []; 
    return dayMeals.map((m: any) => m.number).sort((a: any, b: any) => a - b);
  }, [day, allMeals]);

  if (!currentUser) return null;

  return (
    <div style={{ border: "3px solid #007bff", padding: "20px", marginTop: "30px", borderRadius: "12px"}}>
      <h3 style={{ marginTop: 0 }}>Essen bestellen</h3>
      <p>Bestellen für: <b>{currentUser.name}</b></p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", flexWrap: "wrap" }}>
        <select value={day} onChange={e => { setDay(e.target.value); setNr(""); }} style={inputStyle}>
          {days.map((d: string) => <option key={d}>{d}</option>)}
        </select>

        <select value={nr} onChange={e => setNr(e.target.value)} style={inputStyle}>
          <option value="">Menü wählen...</option>
          {availableNumbers.map((num: string) => (
            <option key={num} value={num}>Menü #{num}</option>
          ))}
        </select>

        <button onClick={() => { if(nr) { onOrder(day, nr); setNr(""); } }} style={blueBtn} disabled={!nr}>
          Bestellen
        </button>
      </div>
    </div>
  );
}

// layout for user management
function UserManagement({ users, onCreate, onDelete, onResetToken, onUpdateField, currentSuperuser }: {
  users: User[],
  onCreate: (u: any) => void,
  onDelete: (id: string) => void,
  onResetToken: (id: string | undefined, token: string) => void,
  onUpdateField: (userId: string | undefined, field: string, value: any) => void, // Hinzugefügt
  currentSuperuser: boolean | undefined
}) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState(""); // Neuer State für Zusatz-Info
  const [adm, setAdm] = useState(false);
  
  return (
    <div style={cardStyle}>
      <h3>👥 Benutzerverwaltung</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Passwort" value={token} onChange={e => setToken(e.target.value)} style={inputStyle} />
        <input placeholder="Zusatzinfos (z.B. Büro/Amt)" value={info} onChange={e => setInfo(e.target.value)} style={inputStyle} />
        
        <label><input type="checkbox" checked={adm} onChange={e => setAdm(e.target.checked)} /> Admin</label>
        
        <button onClick={() => { 
            // information on creation field
            onCreate({ name, token: token, is_admin: adm, info: info });
            setName(""); setToken(""); setAdm(false); setInfo(""); 
          }} style={greenBtn}>Hinzufügen</button>
      </div>

      <table style={{ width: "100%", textAlign: "left" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Zusatz-Info</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: User) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              {/* display additional information */}
              <td> 
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    			<span style={{ color: "#666", fontStyle: "italic" }}>
      			  {u.info || "-"}
    			</span>
              
              	{/* only superusers can see the Edit button for the info field */}
    			{currentSuperuser && (
      			  <button 
        			onClick={() => {
          			const newInfo = prompt(`Neue Zusatzinfo für ${u.name} (z.B. Büro):`, u.info || "");
          			if (newInfo !== null) onUpdateField(u.id, "info", newInfo);
        			}}
        			style={{ 
          			background: "none", 
          			border: "3px dashed #007bff", 
          			cursor: "pointer", 
          			color: "#007bff",
          			padding: "2px 5px",
          			marginLeft: "15px"
        			}}>
        			  Ändern
      				</button>
    			  )}
              </div>
              </td>
              <td>{u.is_superuser ? "Superuser" : u.is_admin ? "Admin" : "User"}</td>
              <td>
                <div style={{ display: "flex", gap: "10px" }}>
                  
                  {!currentSuperuser && !u.is_admin && !u.is_superuser && (
                    <button onClick={() => u.id && onDelete(u.id)} style={smallDeleteBtn}>Löschen</button>
                  )}
                  
                  {currentSuperuser && !u.is_superuser && (
                    <button onClick={() => u.id && onDelete(u.id)} style={smallDeleteBtn}>Löschen</button>
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
  const [n, setN] = useState(""); 
  const [p, setP] = useState(""); 
  const [num, setNum] = useState("");

  const handlePriceChange = (val: string) => {
    // allow only numbers from 0-9 '.' ','
    const regex = /^[0-9]*[.,]?[0-9]*$/;
    if (val === "" || regex.test(val)) {
      setP(val);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "15px", padding: "10px", fontSize: "1.25", gap: "5px" }}>
      <input type="number" placeholder="Nr." size={2} value={num} onChange={e => setNum(e.target.value)} style={inputStyle} />
      <input placeholder="Gericht" value={n} onChange={e => setN(e.target.value)} style={inputStyle} />
      <input placeholder="Preis (z.B. 5,50)" size={10} value={p} onChange={e => handlePriceChange(e.target.value)} style={inputStyle} />
      <button onClick={() => { 
        if(n && p && num) { 
          onAdd(day, { name: n, price: p, number: num }); 
          setN(""); setP(""); setNum(""); 
        } 
      }} style={greenBtn}>+</button>
    </div>
  );
}

// style
const headerStyle = { 
  padding: "15px", 
  borderRadius: "12px", 
  marginBottom: "20px", 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  border: "3px solid var(--border-color)" 
};

const infoBannerStyle = {
  padding: "15px",
  borderRadius: "12px",
  backgroundColor: "none",
  marginBottom: "20px",
  marginTop: "20px",
  color: "var(--text-color)",
  border: "3px solid #ffcc00",
  fontSize: "1.05em"
}

const cardStyle = { 
  border: "3px solid var(--border-color)", 
  backgroundColor: "var(--card-bg)",
  padding: "15px", 
  marginBottom: "20px", 
  borderRadius: "12px", 
  color: "var(--text-color)"
};

const navBtnStyle = (active: boolean, activeColor = "#007bff") => ({ 
  padding: "10px 20px", 
  backgroundColor: active ? activeColor : "#fff", 
  color: active ? "#fff" : "#333", 
  borderRadius: "12px", 
  border: "3px solid",
  cursor: "pointer", 
  fontWeight: "bold" as const, 
  transition: "background-color 0.2s"
});

const inputStyle = { 
  padding: "10px", 
  borderRadius: "12px", 
  border: "3px solid var(--border-color)", 
  backgoundColor: "var(--input-bg)",
  color: "var(--text-color)"
};

const summaryBoxStyle = { 
  display: "flex", 
  gap: "10px", 
  margin: "10px 0", 
  flexWrap: "wrap" as const, 
  borderRadius: "12px"
};

const badgeStyle = { 
  backgroundColor: "none", 
  color: "var(--text-color)", 
  padding: "4px 10px", 
  borderRadius: "12px", 
  border: "3px solid #8B0000",
  fontSize: "0.85em" 
};

const blueBtn = { 
  padding: "10px 20px", 
  backgroundColor: "#007bff", 
  color: "white", 
  border: "none", 
  borderRadius: "12px", 
  cursor: "pointer" 
};

const greenBtn = { 
  padding: "10px 15px", 
  backgroundColor: "#28a745", 
  color: "white", 
  border: "none", 
  borderRadius: "12px", 
  cursor: "pointer" 
};

const greyBtn = { 
  padding: "10px 15px", 
  backgroundColor: "#6c757d", 
  color: "white", 
  border: "none", 
  borderRadius: "12px", 
  cursor: "pointer" 
};  

const redBtn = {
  paddding: "10px 15px",
  backgroundColor: "#673147",
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer"

}

const resetBtnStyle = { 
  marginTop: "30px", 
  backgroundColor: "#dc3545", 
  color: "white", 
  border: "none", 
  padding: "12px", 
  borderRadius: "12px", 
  width: "100%", 
  cursor: "pointer", 
  fontWeight: "bold" as const 
};

const textBtnStyle = { 
  color: "red", 
  border: "none", 
  background: "none", 
  cursor: "pointer",
  borderRadius: "12px" 
};

const smallDeleteBtn = { 
  fontSize: "0.9em", 
  color: "#dc3545", 
  border: "3px solid #dc3545", 
  borderRadius: "12px", 
  background: "none", 
  cursor: "pointer",
  padding: "10px" 
};

const editedOrderRowStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  backgroundColor: "none", 
  padding: "8px 12px",
  borderRadius: "12px",
  border: "3px solid #ffc107", 
  marginTop: "2px"
};

const normalOrderRowStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  padding: "5px 8px"
};
