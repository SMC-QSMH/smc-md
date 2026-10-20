/* SMC MD — config.js
 * ค่าตั้งค่าของหน้าเว็บ · แก้ไฟล์นี้ไฟล์เดียวตอนย้ายเครื่องหรือ deploy ใหม่
 *
 * วิธีหา API_URL
 *  1. เปิดโครงการ Apps Script ของระบบ
 *  2. Deploy › New deployment › Web app
 *     Execute as:  Me
 *     Who has access:  Anyone
 *  3. คัดลอก Web app URL (ลงท้าย /exec) มาวางด้านล่าง
 *
 * ⚠ ทุกครั้งที่แก้โค้ด .gs ต้องกด Deploy ใหม่ (Manage deployments › แก้ไข › Version: New version)
 *   ไม่ใช่แค่กด Save ไม่งั้นหน้าเว็บจะยังเรียกโค้ดเวอร์ชันเดิม
 */

var CFG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzOwaFEOa0qwV3lTbGUgKyKgYxz6lIhLmdN_yke6zgICud75TRpbBy6cMBkQkXUqhnj1A/exec',

  /* ต้องตรงกับ APP.BUILD ใน Config.gs — ถ้าไม่ตรงระบบจะเตือนให้ล้างแคช */
  BUILD: '2569-10-20.1',

  /* รีเฟรชหน้าที่ดูข้อมูลสดอัตโนมัติ (วินาที) · 0 = ปิด */
  AUTO_REFRESH: 0,

  /* เก็บโทเคนไว้กี่ชั่วโมงในเครื่อง (หลังจากนั้นต้องล็อกอินใหม่) */
  TOKEN_HOURS: 8
};
