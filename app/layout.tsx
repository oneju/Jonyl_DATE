import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'종일 — 약속 전의 시간까지',description:'준비, 이동, 준비물을 함께 계획하는 개인 캘린더',manifest:'/manifest.webmanifest'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
