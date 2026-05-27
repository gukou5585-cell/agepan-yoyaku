import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBI2i2y0TeAk9caNwc5XwyMZaVlUOZdYz0",
  authDomain: "kyushoku-aa875.firebaseapp.com",
  databaseURL: "https://kyushoku-aa875-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kyushoku-aa875",
  storageBucket: "kyushoku-aa875.firebasestorage.app",
  messagingSenderId: "479867335084",
  appId: "1:479867335084:web:f2057ea605f317c04c8a09",
  measurementId: "G-GZF0DW1QHS"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const DB_KEY = "kyushoku";

async function loadData() {
  const snap = await get(ref(db, DB_KEY));
  return snap.exists() ? snap.val() : { reservations: [], nextNo: 1, timeSettings: null };
}
async function saveData(data) {
  await set(ref(db, DB_KEY), data);
}
function subscribeData(cb) {
  return onValue(ref(db, DB_KEY), (snap) =>
    cb(snap.exists() ? snap.val() : { reservations: [], nextNo: 1, timeSettings: null })
  );
}

// ─── デフォルト時間設定 ──────────────────────────────────────
const DEFAULT_TIME_SETTINGS = { startH: 9, startM: 0, endH: 15, endM: 45, intervalMin: 15 };

function buildTimeSlots(settings) {
  const { startH, startM, endH, endM, intervalMin } = settings;
  const slots = [];
  let h = startH, m = startM;
  while (h < endH || (h === endH && m <= endM)) {
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m += intervalMin;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

// ─── 日付（当日のみ） ─────────────────────────────────────────
const today    = new Date();
const weekdays = ["日","月","火","水","木","金","土"];
const fmtDate  = (d) => `${d.getMonth()+1}/${d.getDate()}`;
const todayStr = fmtDate(today);
const todayWday = weekdays[today.getDay()];

// ─── メニュー ────────────────────────────────────────────────
const menuItems = [
  { id: 1, name: "揚げパン ココア味", price: 300, emoji: "🍫", popular: true  },
  { id: 2, name: "揚げパン きな粉味", price: 300, emoji: "🍩", popular: true  },
  { id: 3, name: "唐揚げ",            price: 300, emoji: "🍗", popular: false },
  { id: 4, name: "クレープ 苺味",     price: 200, emoji: "🍓", popular: false },
  { id: 5, name: "クレープ チョコ味", price: 200, emoji: "🍫", popular: false },
  { id: 6, name: "プリンタルト",      price: 200, emoji: "🍮", popular: false },
  { id: 7, name: "牛乳",             price: 150, emoji: "🥛", popular: false },
  { id: 8, name: "お茶",             price: 100, emoji: "🍵", popular: false },
];
const MILK_ID = 7;
const MILMAKE  = { id: 99, name: "ミルメーク コーヒー味", price: 50, emoji: "☕" };

// ─── QRコード ────────────────────────────────────────────────
function QRCanvas({ url, size = 160 }) {
  const ref2 = useRef();
  useEffect(() => {
    if (!ref2.current || !url) return;
    const draw = () => {
      if (!ref2.current) return;
      ref2.current.innerHTML = "";
      // eslint-disable-next-line no-undef
      new window.QRCode(ref2.current, { text: url, width: size, height: size, correctLevel: 0 });
    };
    if (window.QRCode) { draw(); return; }
    const ex = document.getElementById("qrscript");
    if (ex) { ex.addEventListener("load", draw); return () => ex.removeEventListener("load", draw); }
    const sc = document.createElement("script");
    sc.id = "qrscript";
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    sc.onload = draw;
    document.head.appendChild(sc);
  }, [url, size]);
  return <div ref={ref2} style={{ display:"inline-block" }} />;
}

// ─── ルーター ────────────────────────────────────────────────
export default function App() {
  const getMode = () => {
    const h = window.location.hash;
    if (h === "#reserve") return "reserve";
    if (h === "#admin")   return "admin";
    return "home";
  };
  const [view, setView] = useState(getMode);
  const navigate = (v) => { window.location.hash = v === "home" ? "" : v; setView(v); };
  useEffect(() => {
    const fn = () => setView(getMode());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return (
    <div style={s.root}>
      <style>{css}</style>
      {view === "home"    && <HomeView    navigate={navigate} />}
      {view === "reserve" && <ReserveView navigate={navigate} />}
      {view === "admin"   && <AdminView   navigate={navigate} />}
    </div>
  );
}

// ─── ホーム ──────────────────────────────────────────────────
function HomeView({ navigate }) {
  const base       = window.location.href.split("#")[0];
  const reserveUrl = base + "#reserve";
  const adminUrl   = base + "#admin";
  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerDeco}>🍞</div>
        <div style={s.headerCenter}>
          <h1 style={s.title}>あげパン よやくシステム</h1>
          <p style={s.subtitle}>★ きょうのきゅうしょくをえらぼう！ ★</p>
        </div>
        <div style={s.headerDeco}>🍞</div>
      </header>
      <div style={s.dotDivider} />

      {/* 当日表示 */}
      <div style={s.todayBanner}>
        <span style={s.todayLabel}>📅 本日</span>
        <span style={s.todayDate}>{todayStr}（{todayWday}）</span>
      </div>

      <div style={s.homeCard}>
        <button className="bounce-hover" style={s.bigBtn} onClick={() => navigate("reserve")}>
          <span style={{fontSize:44}}>🍩</span><span style={s.bigBtnLabel}>よやくする</span>
        </button>
        <button className="bounce-hover" style={{...s.bigBtn, background:"linear-gradient(135deg,#43a047,#66bb6a)", borderColor:"#2e7d32", boxShadow:"4px 4px 0 #1b5e20"}} onClick={() => navigate("admin")}>
          <span style={{fontSize:44}}>📋</span><span style={s.bigBtnLabel}>管理者画面</span>
        </button>
      </div>

      <div style={s.qrRow}>
        <div style={s.qrBlock}>
          <div style={s.qrBadge}>🍩 よやく用</div>
          <div style={{...s.qrBox, borderColor:"#ff6b35"}}><QRCanvas url={reserveUrl} size={140} /></div>
          <p style={s.qrNote}>予約する人はこちら</p>
        </div>
        <div style={s.qrBlock}>
          <div style={{...s.qrBadge, background:"#43a047"}}>📋 管理者用</div>
          <div style={{...s.qrBox, borderColor:"#43a047"}}><QRCanvas url={adminUrl} size={140} /></div>
          <p style={s.qrNote}>管理者はこちら</p>
        </div>
      </div>
      <p style={{textAlign:"center", fontSize:11, color:"#a07850", marginTop:8}}>スクリーンショットして配布してね 📸</p>
      <div style={s.footer}>🍞 ✨ 🥛 ✨ 🍞 ✨ 🥛 ✨ 🍞</div>
    </div>
  );
}

// ─── 予約フォーム ─────────────────────────────────────────────
function ReserveView({ navigate }) {
  const [step, setStep]                           = useState(1);
  const [selectedTime, setSelectedTime]           = useState(null);
  const [cart, setCart]                           = useState({});
  const [milmake, setMilmake]                     = useState(false);
  const [showMilmakePrompt, setShowMilmakePrompt] = useState(false);
  const [reservationNo, setReservationNo]         = useState(null);
  const [completedItems, setCompletedItems]       = useState([]);
  const [completedTotal, setCompletedTotal]       = useState(0);
  const [saving, setSaving]                       = useState(false);
  const [timeSlots, setTimeSlots]                 = useState(buildTimeSlots(DEFAULT_TIME_SETTINGS));

  // 時間設定をリアルタイム購読
  useEffect(() => {
    return subscribeData((data) => {
      const ts = data.timeSettings || DEFAULT_TIME_SETTINGS;
      setTimeSlots(buildTimeSlots(ts));
    });
  }, []);

  const addItem = (id) => { setCart(c => ({...c,[id]:(c[id]||0)+1})); if(id===MILK_ID) setShowMilmakePrompt(true); };
  const removeItem = (id) => setCart(c => { const n={...c}; if(n[id]>1)n[id]--; else{delete n[id]; if(id===MILK_ID){setMilmake(false);setShowMilmakePrompt(false);}} return n; });

  const hasMilk   = !!cart[MILK_ID];
  const cartTotal = Object.entries(cart).reduce((sum,[id,q])=>sum+menuItems.find(m=>m.id===+id).price*q,0)+(milmake?MILMAKE.price:0);
  const cartCount = Object.values(cart).reduce((a,b)=>a+b,0)+(milmake?1:0);
  const allItems  = useCallback(() => {
    const items = Object.entries(cart).map(([id,qty])=>({...menuItems.find(m=>m.id===+id),qty}));
    if(milmake) items.push({...MILMAKE,qty:1});
    return items;
  },[cart,milmake]);

  const handleConfirm = async () => {
    setSaving(true);
    const snapshot = allItems(); const total = cartTotal;
    try {
      const data = await loadData();
      const no = data.nextNo;
      data.reservations.push({
        no, date: todayStr, weekday: todayWday, time: selectedTime,
        items: snapshot, total, createdAt: new Date().toISOString()
      });
      data.nextNo = no + 1;
      await saveData(data);
      setReservationNo(no); setCompletedItems(snapshot); setCompletedTotal(total);
    } catch(e) { alert("保存に失敗しました: "+e.message); }
    setSaving(false);
  };

  const handleReset = () => {
    setStep(1); setCart({}); setSelectedTime(null);
    setMilmake(false); setShowMilmakePrompt(false); setReservationNo(null);
  };

  // ── 完了画面 ─────────────────────────────────────────────
  if (reservationNo) return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backLink} onClick={()=>navigate("home")}>← ホーム</button>
        <div style={s.headerCenter}><h1 style={s.title}>よやく かんりょう！</h1></div>
        <div style={{width:72}}/>
      </header>
      <div style={s.dotDivider}/>
      <div style={{padding:"24px 16px",maxWidth:480,margin:"0 auto"}}>
        <div style={s.successBubble} className="pop-in">
          <div style={s.thanksBanner}>
            <span style={{fontSize:40}}>🎉</span>
            <div>
              <div style={s.thanksTitle}>よやく ありがとう！</div>
              <div style={s.thanksSubtitle}>おいしいごはん たのしみにしててね🍞</div>
            </div>
          </div>
          <p style={{fontSize:13,color:"#a07850",margin:"16px 0 6px"}}>あなたの よやくばんごうは</p>
          <div style={s.bigNo}>No. {String(reservationNo).padStart(4,"0")}</div>
          <p style={{fontSize:11,color:"#a07850",margin:"8px 0 16px"}}>このばんごうをひかえておいてね！</p>
          <div style={s.receipt}>
            <div style={s.receiptRow}><span style={s.receiptLabel}>ひにち</span><span>{todayStr}（{todayWday}）</span></div>
            <div style={s.receiptRow}><span style={s.receiptLabel}>じかん</span><span>{selectedTime}</span></div>
            {completedItems.map(item=>(
              <div key={item.id} style={s.receiptRow}>
                <span>{item.emoji} {item.name} ×{item.qty}</span>
                <span style={{color:"#ff6b35",fontWeight:800}}>¥{(item.price*item.qty).toLocaleString()}</span>
              </div>
            ))}
            <div style={{...s.receiptRow,borderBottom:"none",fontWeight:800,fontSize:16,paddingTop:8}}>
              <span>ごうけい</span><span style={{color:"#ff6b35"}}>¥{completedTotal.toLocaleString()}</span>
            </div>
          </div>
          <button style={{...s.outlineBtn,width:"100%",marginTop:16}} onClick={handleReset}>もう一度よやくする 🔄</button>
        </div>
      </div>
      <div style={s.footer}>🍞 ✨ 🥛 ✨ 🍞</div>
    </div>
  );

  // ── フォーム ────────────────────────────────────────────
  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backLink} onClick={()=>navigate("home")}>← ホーム</button>
        <div style={s.headerCenter}><h1 style={s.title}>あげパン よやく</h1></div>
        <div style={{width:72}}/>
      </header>
      <div style={s.dotDivider}/>

      {/* 当日バナー */}
      <div style={s.todayBanner}>
        <span style={s.todayLabel}>📅 本日のよやく</span>
        <span style={s.todayDate}>{todayStr}（{todayWday}）</span>
      </div>

      {/* ステップ */}
      <div style={s.stepRow}>
        {["じかん","メニュー","かくにん"].map((label,i)=>(
          <div key={i} style={s.stepItem}>
            <div style={{...s.stepCircle,...(step===i+1?s.stepCurrent:step>i+1?s.stepDone:{})}}>{step>i+1?"✓":i+1}</div>
            <span style={{...s.stepText,...(step===i+1?s.stepTextActive:{})}}>{label}</span>
          </div>
        ))}
      </div>

      <div style={s.card}>
        {/* STEP 1: 時間 */}
        {step===1 && (
          <div>
            <div style={s.sectionHead}>⏰ じかんをえらんでね（15ふんきざみ）</div>
            <div style={s.timeGrid}>
              {timeSlots.map(t=>(
                <button key={t} className="bounce-hover"
                  style={{...s.timeBtn,...(selectedTime===t?s.timeBtnActive:{})}}
                  onClick={()=>setSelectedTime(t)}>{t}</button>
              ))}
            </div>
            <button style={{...s.nextBtn,...(!selectedTime?s.btnOff:{})}}
              disabled={!selectedTime} onClick={()=>setStep(2)}>
              つぎへ すすむ！ →
            </button>
          </div>
        )}

        {/* STEP 2: メニュー */}
        {step===2 && (
          <div>
            <div style={s.sectionHead}>🍽️ メニューをえらんでね</div>
            <div style={s.menuGrid}>
              {menuItems.map(item=>(
                <div key={item.id} style={s.menuCard} className="wiggle-hover">
                  {item.popular&&<div style={s.popularBadge}>人気！</div>}
                  <div style={{fontSize:34,marginBottom:6}}>{item.emoji}</div>
                  <div style={s.menuName}>{item.name}</div>
                  <div style={s.menuPrice}>¥{item.price}</div>
                  <div style={s.qtyRow}>
                    {cart[item.id]
                      ?<><button style={s.qtyBtn} onClick={()=>removeItem(item.id)}>－</button><span style={s.qtyNum}>{cart[item.id]}</span><button style={s.qtyBtnPlus} onClick={()=>addItem(item.id)}>＋</button></>
                      :<button style={s.addBtn} onClick={()=>addItem(item.id)}>えらぶ！</button>
                    }
                  </div>
                </div>
              ))}
            </div>
            {hasMilk&&showMilmakePrompt&&(
              <div style={s.milmakeBox} className="pop-in">
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <span style={{fontSize:32}}>☕</span>
                  <div><div style={{fontWeight:800,fontSize:15}}>ミルメーク コーヒー味</div><div style={{fontSize:12,color:"#a07850"}}>牛乳にまぜるとカフェオレ！ ¥{MILMAKE.price}</div></div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button style={{...s.milmakeBtn,...(milmake?s.milmakeBtnOn:{})}} onClick={()=>setMilmake(true)}>✅ つける！</button>
                  <button style={s.milmakeBtn} onClick={()=>{setMilmake(false);setShowMilmakePrompt(false);}}>いらない</button>
                </div>
              </div>
            )}
            {hasMilk&&!showMilmakePrompt&&(
              <div style={s.milmakeChip}>☕ ミルメーク {milmake?"つき ✅":"なし"}<button style={s.milmakeChangeBtn} onClick={()=>setShowMilmakePrompt(true)}>かえる</button></div>
            )}
            {cartCount>0&&(
              <div style={s.cartBar}><span>🛒 {cartCount}こ えらんだよ！</span><span style={{fontSize:18,color:"#ff6b35",fontWeight:800}}>¥{cartTotal.toLocaleString()}</span></div>
            )}
            <div style={s.btnRow}>
              <button style={s.backBtn} onClick={()=>setStep(1)}>← もどる</button>
              <button style={{...s.nextBtn,flex:2,...(cartCount===0?s.btnOff:{})}} disabled={cartCount===0} onClick={()=>setStep(3)}>つぎへ！ →</button>
            </div>
          </div>
        )}

        {/* STEP 3: 確認 */}
        {step===3 && (
          <div>
            <div style={s.sectionHead}>📋 かくにんしてね</div>
            <div style={s.confirmCard}>
              <div style={s.confirmRow}><span style={s.confirmLabel}>ひにち</span><span>{todayStr}（{todayWday}）</span></div>
              <div style={s.confirmRow}><span style={s.confirmLabel}>じかん</span><span>{selectedTime}</span></div>
              <div style={s.dividerLine}/>
              {allItems().map(item=>(
                <div key={item.id} style={s.confirmRow}><span>{item.emoji} {item.name} ×{item.qty}</span><span style={{color:"#ff6b35",fontWeight:800}}>¥{(item.price*item.qty).toLocaleString()}</span></div>
              ))}
              <div style={s.dividerLine}/>
              <div style={{...s.confirmRow,fontWeight:800,fontSize:18}}><span>ごうけい</span><span style={{color:"#ff6b35"}}>¥{cartTotal.toLocaleString()}</span></div>
            </div>
            <div style={s.btnRow}>
              <button style={s.backBtn} onClick={()=>setStep(2)}>← もどる</button>
              <button style={{...s.nextBtn,flex:2,background:"linear-gradient(135deg,#ff6b35,#ff9a3c)",opacity:saving?0.6:1}} disabled={saving} onClick={handleConfirm}>
                {saving?"ほぞんちゅう…":"🎉 よやくする！"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={s.footer}>🍞 ✨ 🥛 ✨ 🍞 ✨ 🥛 ✨ 🍞</div>
    </div>
  );
}

// ─── 管理者画面 ───────────────────────────────────────────────
const ADMIN_PASSWORD = "予約管理";

function AdminView({ navigate }) {
  const [authed, setAuthed]         = useState(false);
  const [pwInput, setPwInput]       = useState("");
  const [pwError, setPwError]       = useState(false);
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filterDate, setFilterDate] = useState("all");
  const [tab, setTab]               = useState("list");

  // 時間設定編集用 state
  const [editingTime, setEditingTime]   = useState(false);
  const [timeDraft, setTimeDraft]       = useState(DEFAULT_TIME_SETTINGS);
  const [savingTime, setSavingTime]     = useState(false);

  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else { setPwError(true); setPwInput(""); }
  };

  useEffect(() => {
    if (!authed) return;
    return subscribeData((d) => {
      setData(d);
      setLoading(false);
      if (d.timeSettings) setTimeDraft(d.timeSettings);
    });
  }, [authed]);

  // パスワード画面
  if (!authed) return (
    <div style={s.page}>
      <header style={{...s.header, background:"linear-gradient(135deg,#2e7d32,#43a047 50%,#66bb6a)", boxShadow:"0 4px 0 #1b5e20"}}>
        <button style={s.backLink} onClick={()=>navigate("home")}>← ホーム</button>
        <div style={s.headerCenter}><h1 style={s.title}>📋 管理者画面</h1></div>
        <div style={{width:48}}/>
      </header>
      <div style={{...s.dotDivider, background:"repeating-linear-gradient(90deg,#2e7d32 0,#2e7d32 12px,transparent 12px,transparent 20px)"}}/>
      <div style={{maxWidth:360, margin:"60px auto 0", padding:"0 24px"}}>
        <div style={s.loginCard} className="pop-in">
          <div style={{fontSize:52, marginBottom:12}}>🔐</div>
          <div style={s.loginTitle}>パスワードをにゅうりょく</div>
          <input
            style={{...s.loginInput, borderColor: pwError ? "#ff6b35" : "#a5d6a7"}}
            type="password"
            placeholder="パスワード"
            value={pwInput}
            onChange={e=>{ setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e=>{ if(e.key==="Enter") handleLogin(); }}
          />
          {pwError && <div style={s.loginError}>❌ パスワードがちがいます</div>}
          <button style={s.loginBtn} onClick={handleLogin}>ログイン →</button>
        </div>
      </div>
      <div style={{...s.footer, color:"#66bb6a"}}>📋 ✨ 📋 ✨ 📋</div>
    </div>
  );

  const handleSaveTime = async () => {
    setSavingTime(true);
    try {
      const d = await loadData();
      d.timeSettings = timeDraft;
      await saveData(d);
      setEditingTime(false);
    } catch(e) { alert("保存失敗: "+e.message); }
    setSavingTime(false);
  };

  const reservations = data?.reservations ?? [];
  const currentTS    = data?.timeSettings || DEFAULT_TIME_SETTINGS;
  const allDates     = [...new Set(reservations.map(r=>r.date))].sort();
  const filtered     = filterDate==="all" ? reservations : reservations.filter(r=>r.date===filterDate);
  const itemCounts   = {};
  reservations.forEach(r=>r.items.forEach(item=>{ itemCounts[item.name]=(itemCounts[item.name]||0)+item.qty; }));
  const totalSales   = reservations.reduce((s,r)=>s+r.total,0);

  const fmtSlot = (ts) => {
    const slots = buildTimeSlots(ts);
    return slots.length > 0 ? `${slots[0]} ～ ${slots[slots.length-1]}（${ts.intervalMin}分きざみ・${slots.length}枠）` : "－";
  };

  const numOpts = (min, max) => Array.from({length: max-min+1}, (_,i)=>min+i);
  const minOpts = [0, 15, 30, 45];

  return (
    <div style={s.page}>
      <header style={{...s.header, background:"linear-gradient(135deg,#2e7d32,#43a047 50%,#66bb6a)", boxShadow:"0 4px 0 #1b5e20"}}>
        <button style={s.backLink} onClick={()=>navigate("home")}>← ホーム</button>
        <div style={s.headerCenter}><h1 style={s.title}>📋 管理者画面</h1></div>
        <div style={{width:48}}/>
      </header>
      <div style={{...s.dotDivider, background:"repeating-linear-gradient(90deg,#2e7d32 0,#2e7d32 12px,transparent 12px,transparent 20px)"}}/>

      {loading ? <div style={{textAlign:"center",padding:48,fontSize:24}}>⏳ よみこみちゅう…</div> : (
        <div style={{maxWidth:640,margin:"0 auto",padding:"0 16px"}}>

          {/* サマリー */}
          <div style={s.summaryRow}>
            <div style={s.summaryCard}><div style={s.summaryNum}>{reservations.length}</div><div style={s.summaryLabel}>総予約数</div></div>
            <div style={s.summaryCard}><div style={{...s.summaryNum,color:"#ff6b35",fontSize:20}}>¥{totalSales.toLocaleString()}</div><div style={s.summaryLabel}>総売上見込み</div></div>
            <div style={s.summaryCard}><div style={{...s.summaryNum,color:"#2e7d32"}}>{(data.nextNo||1)-1}</div><div style={s.summaryLabel}>発行番号数</div></div>
          </div>

          {/* ── 時間設定パネル ─────────────────────────────── */}
          <div style={s.timePanel}>
            <div style={s.timePanelTop}>
              <span style={s.timePanelTitle}>⏰ 受付時間の設定</span>
              {!editingTime && (
                <button style={s.editTimeBtn} onClick={()=>setEditingTime(true)}>✏️ 変更する</button>
              )}
            </div>

            {!editingTime ? (
              <div style={s.timePanelCurrent}>{fmtSlot(currentTS)}</div>
            ) : (
              <div style={s.timeEditForm}>
                <div style={s.timeEditRow}>
                  <span style={s.timeEditLabel}>開始</span>
                  <select style={s.timeSelect} value={timeDraft.startH} onChange={e=>setTimeDraft(d=>({...d,startH:+e.target.value}))}>
                    {numOpts(6,14).map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
                  </select>
                  <span style={s.timeSep}>時</span>
                  <select style={s.timeSelect} value={timeDraft.startM} onChange={e=>setTimeDraft(d=>({...d,startM:+e.target.value}))}>
                    {minOpts.map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
                  </select>
                  <span style={s.timeSep}>分</span>
                </div>
                <div style={s.timeEditRow}>
                  <span style={s.timeEditLabel}>終了</span>
                  <select style={s.timeSelect} value={timeDraft.endH} onChange={e=>setTimeDraft(d=>({...d,endH:+e.target.value}))}>
                    {numOpts(10,22).map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
                  </select>
                  <span style={s.timeSep}>時</span>
                  <select style={s.timeSelect} value={timeDraft.endM} onChange={e=>setTimeDraft(d=>({...d,endM:+e.target.value}))}>
                    {minOpts.map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
                  </select>
                  <span style={s.timeSep}>分</span>
                </div>
                <div style={s.timeEditRow}>
                  <span style={s.timeEditLabel}>きざみ</span>
                  <select style={s.timeSelect} value={timeDraft.intervalMin} onChange={e=>setTimeDraft(d=>({...d,intervalMin:+e.target.value}))}>
                    {[5,10,15,20,30,60].map(v=><option key={v} value={v}>{v}分</option>)}
                  </select>
                </div>
                <div style={s.timeEditPreview}>
                  プレビュー: {fmtSlot(timeDraft)}
                </div>
                <div style={{display:"flex",gap:10,marginTop:12}}>
                  <button style={s.cancelBtn} onClick={()=>{setEditingTime(false);setTimeDraft(currentTS);}}>キャンセル</button>
                  <button style={{...s.saveTimeBtn,opacity:savingTime?0.6:1}} disabled={savingTime} onClick={handleSaveTime}>
                    {savingTime?"保存中…":"✅ 保存する"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* タブ */}
          <div style={s.tabRow}>
            <button style={{...s.tabBtn,...(tab==="list"?s.tabBtnActive:{})}} onClick={()=>setTab("list")}>📋 予約一覧</button>
            <button style={{...s.tabBtn,...(tab==="stats"?s.tabBtnActive:{})}} onClick={()=>setTab("stats")}>📊 品目集計</button>
          </div>

          {/* 品目集計 */}
          {tab==="stats" && (
            <div style={{marginTop:8}}>
              {[...menuItems,MILMAKE].map(m=>{
                const cnt = itemCounts[m.name]||0;
                const max = Math.max(...Object.values(itemCounts),1);
                return (
                  <div key={m.id} style={s.statRow}>
                    <span style={{fontSize:22,flexShrink:0}}>{m.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                      <div style={s.barBg}><div style={{...s.barFill,width:`${(cnt/max)*100}%`}}/></div>
                    </div>
                    <span style={s.statCount}>{cnt}個</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 予約一覧 */}
          {tab==="list" && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 8px",flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:700,color:"#2e7d32"}}>絞り込み：</span>
                <select style={s.filterSelect} value={filterDate} onChange={e=>setFilterDate(e.target.value)}>
                  <option value="all">すべての日</option>
                  {allDates.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{fontSize:12,color:"#888"}}>{filtered.length}件</span>
              </div>
              {filtered.length===0
                ? <div style={s.emptyMsg}>まだ予約はないよ 🍩</div>
                : filtered.slice().reverse().map(r=>(
                  <div key={r.no} style={s.reserveCard}>
                    <div style={s.reserveCardTop}>
                      <div style={s.reserveNo}>No. {String(r.no).padStart(4,"0")}</div>
                      <div style={s.reserveDateTime}>
                        <span>{r.date}（{r.weekday}）</span>
                        <span style={{marginLeft:6,background:"#fff3cc",border:"1px solid #ffc83d",borderRadius:8,padding:"2px 8px",fontSize:12}}>⏰ {r.time}</span>
                      </div>
                    </div>
                    <div style={{padding:"6px 0"}}>
                      {r.items.map(item=>(
                        <div key={item.id} style={s.reserveItemRow}>
                          <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>{item.emoji}</span><span>{item.name}</span><span style={s.qtyBadge}>×{item.qty}</span></span>
                          <span style={{color:"#ff6b35",fontWeight:700}}>¥{(item.price*item.qty).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div style={s.reserveTotal}>合計 <span style={{color:"#ff6b35",fontSize:16}}>¥{r.total.toLocaleString()}</span></div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
      <div style={{...s.footer,color:"#66bb6a"}}>📋 ✨ 📋 ✨ 📋 ✨ 📋</div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Yomogi&family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fff9ec}
  .bounce-hover{transition:transform .15s}
  .bounce-hover:hover{transform:scale(1.06) rotate(-1deg)}
  .wiggle-hover{transition:transform .15s}
  .wiggle-hover:hover{transform:translateY(-4px) rotate(.5deg)}
  .pop-in{animation:popIn .5s cubic-bezier(.34,1.56,.64,1)}
  @keyframes popIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
  button:active{transform:scale(.95)}
  select:focus{outline:2px solid #66bb6a}
`;

// ─── スタイル ─────────────────────────────────────────────────
const s = {
  root:{fontFamily:"'M PLUS Rounded 1c',sans-serif",color:"#3d2b0e"},
  page:{minHeight:"100vh",background:"#fff9ec",paddingBottom:40},
  header:{background:"linear-gradient(135deg,#ff6b35,#ff9a3c 50%,#ffc83d)",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 4px 0 #e05520"},
  headerCenter:{textAlign:"center",flex:1},headerDeco:{fontSize:32},
  title:{fontFamily:"'Yomogi',cursive",fontSize:19,color:"#fff",textShadow:"2px 2px 0 #b84010"},
  subtitle:{fontSize:11,color:"#fff3cc",marginTop:3},
  dotDivider:{height:8,background:"repeating-linear-gradient(90deg,#ff6b35 0,#ff6b35 12px,transparent 12px,transparent 20px)"},
  backLink:{background:"rgba(255,255,255,.25)",border:"2px solid rgba(255,255,255,.5)",borderRadius:20,padding:"6px 12px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},

  // 当日バナー
  todayBanner:{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"linear-gradient(135deg,#fff3cc,#ffe0b2)",borderBottom:"3px dashed #ffc83d",padding:"10px 16px"},
  todayLabel:{fontSize:12,fontWeight:800,color:"#a07850"},
  todayDate:{fontSize:18,fontWeight:800,color:"#ff6b35",fontFamily:"'Yomogi',cursive"},

  homeCard:{maxWidth:480,margin:"20px auto 0",padding:"0 16px",display:"flex",flexDirection:"column",gap:14},
  bigBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"22px 16px",background:"linear-gradient(135deg,#ff9a3c,#ffc83d)",border:"3px solid #e07020",borderRadius:22,cursor:"pointer",boxShadow:"4px 4px 0 #b84010",fontFamily:"inherit"},
  bigBtnLabel:{fontWeight:800,fontSize:19,color:"#fff",textShadow:"1px 1px 0 #b84010"},
  qrRow:{display:"flex",gap:20,justifyContent:"center",margin:"24px 16px 0",flexWrap:"wrap"},
  qrBlock:{textAlign:"center"},
  qrBadge:{background:"#ff6b35",color:"#fff",fontWeight:800,fontSize:13,borderRadius:20,padding:"5px 14px",marginBottom:10,display:"inline-block"},
  qrBox:{background:"#fff",border:"3px solid #ffc83d",borderRadius:14,padding:12,display:"inline-block",boxShadow:"4px 4px 0 #ffa020"},
  qrNote:{fontSize:11,color:"#a07850",marginTop:8},

  stepRow:{display:"flex",justifyContent:"center",gap:24,padding:"12px",background:"#fff3d6",borderBottom:"3px dashed #ffc83d"},
  stepItem:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},
  stepCircle:{width:30,height:30,borderRadius:"50%",border:"3px solid #ddd",background:"#fff",color:"#bbb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800},
  stepCurrent:{border:"3px solid #ff6b35",color:"#ff6b35",background:"#fff3ec"},
  stepDone:{background:"#ff6b35",border:"3px solid #ff6b35",color:"#fff"},
  stepText:{fontSize:10,color:"#bbb",fontWeight:700},stepTextActive:{color:"#ff6b35"},

  card:{maxWidth:560,margin:"18px auto 0",padding:"0 16px"},
  sectionHead:{background:"#ffcc00",border:"3px solid #e6a800",borderRadius:12,padding:"9px 14px",fontWeight:800,fontSize:14,marginBottom:12,marginTop:10,boxShadow:"3px 3px 0 #c48c00",display:"inline-block"},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:8},
  timeBtn:{background:"#fff",border:"3px solid #ffc83d",borderRadius:11,padding:"10px 3px",cursor:"pointer",fontWeight:700,fontSize:13,boxShadow:"3px 3px 0 #ffa020",fontFamily:"inherit"},
  timeBtnActive:{background:"#fff3cc",border:"3px solid #ff6b35",color:"#ff6b35",boxShadow:"3px 3px 0 #e05520"},

  nextBtn:{width:"100%",marginTop:18,padding:"15px",background:"linear-gradient(135deg,#ff9a3c,#ffc83d)",border:"3px solid #e07020",borderRadius:15,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"4px 4px 0 #b84010",fontFamily:"inherit"},
  btnOff:{opacity:.4,cursor:"not-allowed"},
  backBtn:{flex:1,padding:"12px",border:"3px solid #ddd",borderRadius:13,background:"#f5f5f5",color:"#888",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"3px 3px 0 #ccc"},
  btnRow:{display:"flex",gap:10,marginTop:18},

  menuGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10},
  menuCard:{background:"#fff",border:"3px solid #ffc83d",borderRadius:16,padding:"13px 10px",textAlign:"center",boxShadow:"4px 4px 0 #ffa020",position:"relative"},
  popularBadge:{position:"absolute",top:-9,right:-5,background:"#ff6b35",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:20,border:"2px solid #fff",boxShadow:"2px 2px 0 #b84010"},
  menuName:{fontWeight:800,fontSize:12,marginBottom:3},
  menuPrice:{fontSize:18,fontWeight:800,color:"#ff6b35",fontFamily:"'Yomogi',cursive",marginBottom:9},
  qtyRow:{display:"flex",alignItems:"center",justifyContent:"center",gap:7},
  qtyBtn:{width:27,height:27,borderRadius:"50%",border:"2px solid #ddd",background:"#f5f5f5",color:"#666",fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  qtyBtnPlus:{width:27,height:27,borderRadius:"50%",border:"2px solid #ff9a3c",background:"#fff3ec",color:"#ff6b35",fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  qtyNum:{fontSize:16,fontWeight:800,minWidth:20,textAlign:"center"},
  addBtn:{padding:"5px 14px",background:"linear-gradient(135deg,#ff9a3c,#ffc83d)",border:"2px solid #e07020",borderRadius:18,color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"2px 2px 0 #b84010",fontFamily:"inherit"},

  milmakeBox:{background:"#fffbe6",border:"3px dashed #ffcc00",borderRadius:14,padding:12,marginTop:12,boxShadow:"3px 3px 0 #ffd966"},
  milmakeBtn:{flex:1,padding:"9px",border:"3px solid #ddd",borderRadius:11,background:"#f5f5f5",color:"#888",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"},
  milmakeBtnOn:{background:"linear-gradient(135deg,#ff9a3c,#ffc83d)",border:"3px solid #e07020",color:"#fff",boxShadow:"3px 3px 0 #b84010"},
  milmakeChip:{display:"flex",alignItems:"center",gap:10,background:"#fffbe6",border:"2px solid #ffcc00",borderRadius:20,padding:"8px 14px",marginTop:10,fontSize:13,fontWeight:700,color:"#7a5c00"},
  milmakeChangeBtn:{marginLeft:"auto",padding:"4px 10px",border:"2px solid #ffcc00",borderRadius:11,background:"#fff",color:"#b88000",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  cartBar:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff3cc",border:"3px solid #ffcc00",borderRadius:13,padding:"11px 14px",marginTop:12,fontWeight:800,fontSize:14,boxShadow:"3px 3px 0 #c48c00"},

  confirmCard:{background:"#fff",border:"3px solid #ffc83d",borderRadius:16,padding:14,boxShadow:"4px 4px 0 #ffa020"},
  confirmRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",fontSize:13,fontWeight:600},
  confirmLabel:{fontSize:12,color:"#a07850",fontWeight:700,minWidth:52},
  dividerLine:{height:2,background:"repeating-linear-gradient(90deg,#ffc83d 0,#ffc83d 8px,transparent 8px,transparent 14px)",margin:"5px 0"},

  thanksBanner:{display:"flex",alignItems:"center",gap:14,background:"linear-gradient(135deg,#fff3cc,#ffe0b2)",border:"3px solid #ffc83d",borderRadius:16,padding:"16px",marginBottom:4},
  thanksTitle:{fontFamily:"'Yomogi',cursive",fontSize:22,color:"#ff6b35",textShadow:"1px 1px 0 #ffa020"},
  thanksSubtitle:{fontSize:12,color:"#a07850",marginTop:4},
  successBubble:{background:"#fff",border:"4px solid #ff6b35",borderRadius:22,padding:"24px 18px",textAlign:"center",boxShadow:"6px 6px 0 #ffa020"},
  bigNo:{fontSize:46,fontWeight:800,color:"#ff6b35",fontFamily:"'Yomogi',cursive",letterSpacing:"0.05em",lineHeight:1.1},
  receipt:{background:"#fff9ec",border:"2px dashed #ffc83d",borderRadius:13,padding:13,textAlign:"left"},
  receiptRow:{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,fontWeight:600,borderBottom:"1px dashed #fde8b0"},
  receiptLabel:{color:"#a07850",fontSize:12,fontWeight:700},
  outlineBtn:{padding:"11px 0",background:"#fff",border:"3px solid #ff6b35",borderRadius:15,color:"#ff6b35",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"3px 3px 0 #ffa020"},

  // 管理
  summaryRow:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"16px 0 12px"},
  summaryCard:{background:"#fff",border:"3px solid #a5d6a7",borderRadius:14,padding:"13px 8px",textAlign:"center",boxShadow:"3px 3px 0 #81c784"},
  summaryNum:{fontSize:24,fontWeight:800,color:"#2e7d32"},
  summaryLabel:{fontSize:10,color:"#4caf50",fontWeight:700,marginTop:3},

  // 時間設定パネル
  timePanel:{background:"#fff",border:"3px solid #a5d6a7",borderRadius:16,padding:"14px 16px",marginBottom:14,boxShadow:"3px 3px 0 #81c784"},
  timePanelTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},
  timePanelTitle:{fontWeight:800,fontSize:15,color:"#2e7d32"},
  timePanelCurrent:{fontSize:13,color:"#3d2b0e",background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"8px 12px",fontWeight:600},
  editTimeBtn:{padding:"6px 14px",background:"linear-gradient(135deg,#43a047,#66bb6a)",border:"2px solid #2e7d32",borderRadius:20,color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",boxShadow:"2px 2px 0 #1b5e20"},
  timeEditForm:{background:"#f1f8e9",border:"2px dashed #a5d6a7",borderRadius:12,padding:"12px"},
  timeEditRow:{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"},
  timeEditLabel:{fontSize:13,fontWeight:800,color:"#2e7d32",minWidth:42},
  timeSelect:{padding:"6px 8px",border:"2px solid #a5d6a7",borderRadius:10,background:"#fff",fontWeight:700,fontFamily:"inherit",fontSize:14,cursor:"pointer"},
  timeSep:{fontSize:13,fontWeight:700,color:"#555"},
  timeEditPreview:{fontSize:12,color:"#43a047",fontWeight:700,background:"#fff",border:"1px solid #a5d6a7",borderRadius:8,padding:"6px 10px",marginBottom:4},
  cancelBtn:{flex:1,padding:"10px",border:"2px solid #ccc",borderRadius:12,background:"#f5f5f5",color:"#888",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"},
  saveTimeBtn:{flex:2,padding:"10px",background:"linear-gradient(135deg,#43a047,#66bb6a)",border:"2px solid #2e7d32",borderRadius:12,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"2px 2px 0 #1b5e20"},

  tabRow:{display:"flex",gap:8,margin:"8px 0"},
  tabBtn:{flex:1,padding:"10px",border:"3px solid #a5d6a7",borderRadius:13,background:"#fff",color:"#4caf50",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  tabBtnActive:{background:"#2e7d32",border:"3px solid #1b5e20",color:"#fff"},
  statRow:{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"2px solid #a5d6a7",borderRadius:12,padding:"10px 12px",marginBottom:7,boxShadow:"2px 2px 0 #81c784"},
  barBg:{height:10,background:"#e8f5e9",borderRadius:5,overflow:"hidden"},
  barFill:{height:"100%",background:"linear-gradient(90deg,#43a047,#66bb6a)",borderRadius:5,transition:"width .4s"},
  statCount:{fontWeight:800,fontSize:14,color:"#2e7d32",minWidth:36,textAlign:"right"},
  filterSelect:{padding:"6px 10px",border:"2px solid #a5d6a7",borderRadius:11,background:"#fff",fontWeight:700,fontFamily:"inherit",fontSize:13,cursor:"pointer"},
  emptyMsg:{textAlign:"center",padding:"32px 0",fontSize:18,color:"#a07850"},
  reserveCard:{background:"#fff",border:"2px solid #c8e6c9",borderRadius:15,padding:"13px",marginBottom:10,boxShadow:"3px 3px 0 #a5d6a7"},
  reserveCardTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:"2px dashed #a5d6a7",flexWrap:"wrap",gap:6},
  reserveNo:{fontWeight:800,fontSize:20,color:"#2e7d32",fontFamily:"'Yomogi',cursive"},
  reserveDateTime:{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"},
  reserveItemRow:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,fontWeight:600,padding:"4px 0",borderBottom:"1px solid #f1f8e9"},
  qtyBadge:{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:8,padding:"1px 7px",fontSize:11,fontWeight:800,color:"#2e7d32"},
  reserveTotal:{textAlign:"right",fontWeight:800,fontSize:14,marginTop:8,paddingTop:6,borderTop:"2px dashed #a5d6a7"},
  footer:{textAlign:"center",marginTop:32,fontSize:16,color:"#ffc83d",letterSpacing:4},

  // ログイン
  loginCard:{background:"#fff",border:"3px solid #a5d6a7",borderRadius:24,padding:"32px 24px",textAlign:"center",boxShadow:"4px 4px 0 #81c784"},
  loginTitle:{fontWeight:800,fontSize:16,color:"#2e7d32",marginBottom:20},
  loginInput:{width:"100%",padding:"14px 16px",border:"3px solid #a5d6a7",borderRadius:14,background:"#fff",color:"#3d2b0e",fontSize:18,fontWeight:700,fontFamily:"inherit",outline:"none",textAlign:"center",marginBottom:8,boxSizing:"border-box"},
  loginError:{fontSize:13,color:"#ff6b35",fontWeight:700,marginBottom:12},
  loginBtn:{width:"100%",marginTop:8,padding:"14px",background:"linear-gradient(135deg,#43a047,#66bb6a)",border:"3px solid #2e7d32",borderRadius:14,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"4px 4px 0 #1b5e20",fontFamily:"inherit"},
};
