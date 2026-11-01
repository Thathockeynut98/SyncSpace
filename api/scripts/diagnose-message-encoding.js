import pg from 'pg';
import {encodingShape} from '../encoding-diagnostics.js';
const space=process.argv[2];if(!space||!/^[-\w]{1,100}$/.test(space))throw Error('Supply the legacy space ID as the only argument. Uses PG environment variables; read-only.');
const pool=new pg.Pool();
try{
 const result=await pool.query("SELECT source_id,original_row->>'iv' AS iv,original_row->>'cipher' AS cipher FROM migration.imported_records WHERE entity_type='Message' AND original_row->>'space_id'=$1 ORDER BY source_id",[space]);
 let suspicious=0;
 for(const row of result.rows){const iv=encodingShape(row.iv,12),cipher=encodingShape(row.cipher);if(iv.category!=='standard-base64'||cipher.category!=='standard-base64'||cipher.bytes<16){suspicious++;console.log(JSON.stringify({recordId:row.source_id,iv,cipher}))}}
 console.log(JSON.stringify({records:result.rowCount,suspicious,readOnly:true,note:result.rowCount?'Shape classification does not prove decryptability. Verify formats against original exports before supporting an alternate encoding.':'No records available here; the private message failures cannot be diagnosed in this database.'}));
}finally{await pool.end()}
