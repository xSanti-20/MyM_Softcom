const http = require('http');

const saleIds = [17, 18, 19, 20, 21];
const baseUrl = 'http://192.168.1.27:5001/api/Sale';

async function migrateQuotas() {
  for (const saleId of saleIds) {
    try {
      console.log(`\nMigrando venta ${saleId}...`);
      
      const url = `${baseUrl}/${saleId}/migrate-quotas`;
      
      const response = await new Promise((resolve, reject) => {
        const req = http.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', reject);
        req.end();
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Respuesta: ${response.data}`);
      console.log('---');
    } catch (error) {
      console.error(`Error migrando venta ${saleId}:`, error.message);
    }
  }
  
  console.log('\n✅ Migración completada');
}

migrateQuotas();
