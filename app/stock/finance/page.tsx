"use client";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
export default function Page() { const c = useThemeColors(); return (<div style={{background:c.bg,minHeight:'100vh'}}><StockTopbar title="finance" /><div style={{padding:40,textAlign:'center',paddingTop:80}}><p style={{fontSize:40}}>🚧</p><p style={{color:c.text2,fontSize:18,fontWeight:600,marginTop:16}}>Coming Soon</p><p style={{color:c.text3}}>หน้า finance กำลังพัฒนา</p></div></div>); }
