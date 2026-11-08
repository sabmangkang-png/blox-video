
import { useEffect, useState } from 'react'
import { supabase, isConfigured, BUCKET } from './supabaseClient.js'

const CATS = ['ทั้งหมด','ความรู้','สารคดี','บันเทิง','เทคโนโลยี','ท่องเที่ยว','อื่น ๆ']
const MOCK = [
  {id:'1',title:'เที่ยวบางปู ดูนกนางนวลยามเย็น',category:'ท่องเที่ยว',duration:'12:34',description:'บรรยากาศบางปู สมุทรปราการ ยามเย็น',status:'published',cover:'linear-gradient(135deg,#7c3aed,#06b6d4)'},
  {id:'2',title:'สอน React + Supabase ใน 15 นาที',category:'เทคโนโลยี',duration:'15:02',description:'สร้างเว็บเก็บวิดีโอแบบฟรี',status:'published',cover:'linear-gradient(135deg,#ec4899,#8b5cf6)'},
  {id:'3',title:'สารคดีทะเลไทย',category:'สารคดี',duration:'22:10',description:'สำรวจระบบนิเวศชายฝั่ง',status:'published',cover:'linear-gradient(135deg,#059669,#06b6d4)'},
]

export default function App(){
  const [view,setView]=useState('home')
  const [videos,setVideos]=useState([])
  const [categories,setCategories]=useState([])
  const [cat,setCat]=useState('ทั้งหมด')
  const [q,setQ]=useState('')
  const [selected,setSelected]=useState(null)
  const [user,setUser]=useState(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [uploadTitle,setUploadTitle]=useState('')
  const [uploadDesc,setUploadDesc]=useState('')
  const [uploadCat,setUploadCat]=useState('')
  const [file,setFile]=useState(null)
  const [msg,setMsg]=useState('')
  const [authMode,setAuthMode]=useState('login')
  const [loading,setLoading]=useState(true)

  async function load(){
    setLoading(true)
    if(!isConfigured){ setVideos(MOCK); setCategories(CATS.slice(1)); setLoading(false); return }
    const {data: cats} = await supabase.from('video_categories').select('*').order('name')
    if(cats) setCategories(cats.map(c=>c.name))
    const {data, error} = await supabase.from('videos').select('*, video_categories(name)').eq('status','published').order('created_at',{ascending:false})
    if(error){ setMsg('โหลดวิดีโอไม่สำเร็จ: '+error.message); setVideos([]) } else {
      setVideos((data||[]).map(v=>({id:v.id,title:v.title,description:v.description,category:v.video_categories?.name||'อื่น ๆ',duration:v.duration_seconds?Math.floor(v.duration_seconds/60)+':'+String(v.duration_seconds%60).padStart(2,'0'):'--:--',status:v.status,file_path:v.file_path,cover:'linear-gradient(135deg,#7c3aed,#06b6d4)'})))
    }
    setLoading(false)
  }
  useEffect(()=>{ load(); if(isConfigured) supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null)) },[])

  async function getSignedUrl(file_path){
    if(!file_path) return null
    const {data} = await supabase.storage.from(BUCKET).createSignedUrl(file_path, 3600)
    return data?.signedUrl
  }
  async function openVideo(v){
    setSelected(v); setView('watch')
    if(v.file_path && isConfigured){ const url = await getSignedUrl(v.file_path); setSelected({...v, playUrl:url}) }
  }
  async function handleLogin(e){
    e.preventDefault()
    if(!isConfigured) return setMsg('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / KEY ใน Vercel')
    if(authMode==='signup'){ const {data,error}=await supabase.auth.signUp({email,password}); if(error) return setMsg('สมัครไม่สำเร็จ: '+error.message); setUser(data.user); setMsg('สมัครสำเร็จ! กำลังไปหน้าอัปโหลด...'); setView('upload'); return } const {data,error} = await supabase.auth.signInWithPassword({email,password})
    if(error) {
      const {error: e2} = await supabase.auth.signUp({email,password})
      if(e2) setMsg(e2.message); else setMsg('สมัครแล้ว เช็คอีเมลยืนยัน แล้วล็อกอินอีกครั้ง')
    } else { setUser(data.user); setMsg('ล็อกอินสำเร็จ'); setView('upload') }
  }
  async function handleUpload(e){
    e.preventDefault()
    if(!isConfigured) return setMsg('ต้องตั้งค่า Supabase ก่อน')
    if(!user) return setMsg('กรุณาล็อกอินก่อน')
    if(!file) return setMsg('เลือกไฟล์วิดีโอ MP4/WebM/MOV ก่อน (ไม่เกิน 100MB)')
    setMsg('กำลังอัปโหลด...')
    const videoId = crypto.randomUUID()
    const path = `${user.id}/${videoId}/${file.name}`
    const {error: upErr} = await supabase.storage.from(BUCKET).upload(path, file, {upsert:false})
    if(upErr) return setMsg('อัปโหลดไม่สำเร็จ: '+upErr.message)
    // หา category id
    const {data: catRow} = await supabase.from('video_categories').select('id').eq('name', uploadCat || categories[0]).single()
    const {error: insErr} = await supabase.from('videos').insert({id: videoId, title: uploadTitle, description: uploadDesc, category_id: catRow?.id, owner_id: user.id, file_path: path, file_size: file.size, mime_type: file.type, status:'published'})
    if(insErr) return setMsg('บันทึกข้อมูลไม่สำเร็จ: '+insErr.message)
    setMsg('อัปโหลดสำเร็จ! สถานะ published เผยแพร่แล้ว ดูได้ทันทีใน Supabase Dashboard')
    setUploadTitle(''); setUploadDesc(''); setFile(null); load()
  }

  const filtered = videos.filter(v=> (cat==='ทั้งหมด'||v.category===cat) && v.title.toLowerCase().includes(q.toLowerCase()))

  return <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 28px',position:'sticky',top:0,background:'rgba(10,10,15,.9)',backdropFilter:'blur(12px)',zIndex:10,borderBottom:'1px solid #222'}}>
      <div onClick={()=>setView('home')} style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:26,cursor:'pointer'}}>BLOX<span style={{background:'linear-gradient(90deg,#a855f7,#06b6d4)',WebkitBackgroundClip:'text',color:'transparent'}}> VIDEO</span></div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>setView('home')} style={btn}>🏠 หน้าแรก</button>
        <button onClick={()=>{setAuthMode('signup'); setView('login')}} style={{...btn,background:'#fff',color:'#000',border:'none',fontWeight:700}}>👤 สมัครสมาชิก</button>
        <span style={{fontSize:12,padding:'8px 10px',background:isConfigured?'#14532d':'#7f1d1d',borderRadius:20}}>{isConfigured?'● เชื่อม Supabase แล้ว':'○ โหมดตัวอย่าง - ยังไม่ตั้งค่า Env'}</span>
      </div>
    </header>

    {view==='home' && <>
      <section style={{padding:'48px 28px 20px',textAlign:'center'}}>
        <h1 style={{fontSize:44,margin:0,lineHeight:1.1}}>คลังวิดีโอของคุณ<br/><span style={{background:'linear-gradient(90deg,#a855f7,#06b6d4)',WebkitBackgroundClip:'text',color:'transparent'}}>สวย ทันสมัย เก็บเป็นหมวดหมู่</span></h1>
        <p style={{color:'#aaa'}}>ฟรีด้วย Supabase + Vercel • อัปโหลดแล้วรออนุมัติ • เล่นผ่าน Signed URL แบบ Private</p>
        {/* ปุ่มอัปโหลดจุดเดียว - อยู่เหนือช่องค้นหา อยู่ตลอดทุกหมวดหมู่ ไม่หาย */}
        <div style={{textAlign:'center',margin:'0 0 20px'}}>{user ? <button onClick={()=>setView('upload')} style={{...btn,background:'linear-gradient(90deg,#7c3aed,#06b6d4)',color:'#fff',border:'none',padding:'14px 32px',fontSize:16,fontWeight:800,borderRadius:999,boxShadow:'0 8px 24px rgba(124,58,237,.4)'}}>⬆ อัปโหลดวิดีโอของคุณ</button> : <button onClick={()=>{setAuthMode('signup'); setView('login')}} style={{...btn,background:'#fff',color:'#000',border:'none',padding:'14px 32px',fontSize:16,fontWeight:800,borderRadius:999}}>👤 สมัครสมาชิกเพื่ออัปโหลด</button>}<p style={{color:'#888',fontSize:12,margin:'8px 0 0'}}>อัปโหลดแล้วขึ้นหน้าแรกทันที • ดูฟรี</p></div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 ค้นหาวิดีโอ..." style={{width:'min(560px,90%)',padding:'14px 18px',borderRadius:999,border:'1px solid #333',background:'#15151f',color:'#fff',fontSize:16,marginTop:16}}/>
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:18}}>{['ทั้งหมด',...categories].map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:'8px 16px',borderRadius:999,border:'none',background:cat===c?'#fff':'#1e1e2a',color:cat===c?'#000':'#fff',fontWeight:600}}>{c}</button>)}</div>
      </section>
      <main style={{padding:'20px 28px 60px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:18}}>
        {loading && <p>กำลังโหลด...</p>}
        {!loading && filtered.length===0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:40,background:'#15151f',borderRadius:16}}><h3>ยังไม่มีวิดีโอในหมวดนี้</h3><p style={{color:'#aaa'}}>กดอัปโหลด แล้วไปเปลี่ยน status เป็น published ใน Supabase Dashboard</p><button onClick={()=>setView('upload')} style={{...btn,background:'#7c3aed',color:'#fff',border:'none'}}>อัปโหลดวิดีโอแรก</button></div>}
        {filtered.map(v=>(
          <article key={v.id} onClick={()=>openVideo(v)} style={{background:'#15151f',borderRadius:16,overflow:'hidden',cursor:'pointer',border:'1px solid #26263a'}}>
            <div style={{height:150,background:v.cover,display:'flex',alignItems:'center',justifyContent:'center',fontSize:44}}>▶️<span style={{position:'absolute'}}></span><span style={{fontSize:12,background:'rgba(0,0,0,.6)',padding:'4px 8px',borderRadius:8,marginLeft:120}}>{v.duration}</span></div>
            <div style={{padding:14}}><span style={{fontSize:12,background:'#7c3aed',padding:'3px 8px',borderRadius:999}}>{v.category}</span><h3 style={{margin:'10px 0 6px'}}>{v.title}</h3><p style={{color:'#aaa',fontSize:13,margin:0}}>{v.description}</p></div>
          </article>
        ))}
      </main>
    </>}

    {view==='watch' && selected && <main style={{padding:'28px',maxWidth:900,margin:'0 auto'}}>
      <button onClick={()=>setView('home')} style={btn}>← กลับ</button>
      <div style={{marginTop:16,aspectRatio:'16/9',background:'#000',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {selected.playUrl ? <video src={selected.playUrl} controls style={{width:'100%',height:'100%'}}/> : <div style={{textAlign:'center'}}><div style={{fontSize:60}}>▶️</div><p>{isConfigured?'กำลังสร้าง Signed URL...':'โหมดตัวอย่าง - ตั้งค่า Supabase แล้ววิดีโอจะเล่นได้จริง'}</p><p style={{color:'#aaa',fontSize:13}}>ไฟล์: {selected.file_path||'ตัวอย่าง'}</p></div>}
      </div>
      <h2>{selected.title}</h2><p style={{color:'#aaa'}}>{selected.description}</p><span style={{background:'#7c3aed',padding:'4px 10px',borderRadius:999,fontSize:12}}>{selected.category}</span>
    </main>}

    {view==='login' && <main style={{maxWidth:440,margin:'40px auto',background:'#15151f',padding:28,borderRadius:20,border:'1px solid #333'}}><div style={{textAlign:'center'}}><div style={{fontSize:48}}>👤</div><h2>{authMode==='signup'?'สมัครสมาชิกฟรี':'เข้าสู่ระบบ'}</h2><p style={{color:'#aaa',fontSize:13}}>{authMode==='signup'?'สมัครครั้งเดียว อัปโหลดวิดีโอได้เลย':'มีบัญชีแล้ว? ล็อกอินเพื่ออัปโหลด'}</p></div><div style={{display:'flex',gap:8,marginBottom:16}}><button onClick={()=>setAuthMode('login')} style={{flex:1,padding:10,borderRadius:10,border:'none',background:authMode==='login'?'#fff':'#222',color:authMode==='login'?'#000':'#fff',fontWeight:700}}>เข้าสู่ระบบ</button><button onClick={()=>setAuthMode('signup')} style={{flex:1,padding:10,borderRadius:10,border:'none',background:authMode==='signup'?'#7c3aed':'#222',color:'#fff',fontWeight:700}}>สมัครสมาชิก</button></div><form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:12}}><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมล เช่น sabmangkang@gmail.com" style={inp}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" style={inp}/><button style={{...btn,background:'#7c3aed',color:'#fff',border:'none',padding:14,fontWeight:700,fontSize:16}}>{authMode==='signup'?'✅ สมัครสมาชิกฟรี':'🔑 เข้าสู่ระบบ'}</button></form><p style={{fontSize:13,color:'#aaa',textAlign:'center'}}>{authMode==='signup'?'สมัครแล้ว ระบบจะพาไปหน้าอัปโหลดทันที':'ยังไม่มีบัญชี? กดปุ่ม สมัครสมาชิก ด้านบน'}</p><p>{msg}</p></main>}

    {view==='upload' && !user && <main style={{maxWidth:440,margin:'40px auto',background:'#15151f',padding:28,borderRadius:20,textAlign:'center'}}><div style={{fontSize:48}}>🔒</div><h2>ต้องสมัครสมาชิกก่อนอัปโหลด</h2><p style={{color:'#aaa'}}>สมัครฟรี 1 นาที แล้วอัปโหลดวิดีโอได้เลย</p><button onClick={()=>{setAuthMode('signup'); setView('login')}} style={{...btn,background:'#7c3aed',color:'#fff',border:'none',padding:14,fontSize:16,fontWeight:700}}>👤 สมัครสมาชิกฟรี</button><br/><br/><button onClick={()=>{setAuthMode('login'); setView('login')}} style={btn}>มีบัญชีแล้ว? เข้าสู่ระบบ</button></main>}{view==='upload' && user && <main style={{maxWidth:560,margin:'40px auto',background:'#15151f',padding:24,borderRadius:16}}><h2>อัปโหลดวิดีโอ</h2><p style={{color:'#aaa',fontSize:13}}>ผู้ใช้: {user?.email} • ไฟล์จะเข้า bucket video-library-private แบบ private • สถานะเริ่มต้น published</p>
      <form onSubmit={handleUpload} style={{display:'flex',flexDirection:'column',gap:12}}>
        <input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="ชื่อวิดีโอ" required style={inp}/>
        <textarea value={uploadDesc} onChange={e=>setUploadDesc(e.target.value)} placeholder="คำอธิบาย" style={{...inp,minHeight:80}}/>
        <select value={uploadCat} onChange={e=>setUploadCat(e.target.value)} style={inp}>{categories.map(c=><option key={c}>{c}</option>)}</select>
        <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files[0])} style={inp}/>
        {file && <p style={{fontSize:13}}>ไฟล์: {file.name} • {(file.size/1024/1024).toFixed(2)} MB {file.size>100*1024*1024 && '⚠️ เกิน 100MB ตาม limit bucket'}</p>}
        <button style={{...btn,background:'#7c3aed',color:'#fff',border:'none',padding:12}}>อัปโหลด (จะได้สถานะ published)</button>
      </form><p>{msg}</p>
      <div style={{background:'#0a0a0f',padding:12,borderRadius:10,fontSize:12,color:'#aaa',marginTop:12}}>ขั้นตอนอนุมัติ: Supabase Dashboard → Table Editor → videos → เปลี่ยน status เป็น published + ใส่ published_at = now() → วิดีโอจะโชว์หน้าแรกทันที</div>
    </main>}

    <footer style={{textAlign:'center',padding:24,color:'#666',fontSize:13}}>BLOX Video Library • Supabase + Vercel Free • อย่าใส่ service_role key ในเว็บ</footer>
  </div>
}
const btn={padding:'8px 14px',borderRadius:999,border:'1px solid #333',background:'#1e1e2a',color:'#fff'}
const inp={padding:'12px',borderRadius:10,border:'1px solid #333',background:'#0a0a0f',color:'#fff'}
