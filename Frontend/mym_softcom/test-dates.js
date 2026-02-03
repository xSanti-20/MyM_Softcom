const baseDate = new Date('2025-01-30');
const dayOfMonth = 30;

console.log('Día solicitado:', dayOfMonth);
console.log('Fecha base:', baseDate.toISOString().split('T')[0]);
console.log('\n--- Probando cálculo actual ---');

for (let i = 1; i <= 12; i++) {
  const targetMonth = baseDate.getMonth() + (i - 1);
  const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
  const adjustedMonth = targetMonth % 12;
  const maxDay = new Date(targetYear, adjustedMonth + 1, 0).getDate();
  const finalDay = Math.min(dayOfMonth, maxDay);
  const quotaDate = new Date(targetYear, adjustedMonth, finalDay);
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  console.log(`Cuota ${i}: ${quotaDate.toISOString().split('T')[0]} (${monthNames[adjustedMonth]}) - Max días: ${maxDay}, Día final: ${finalDay}`);
}
