import json
import os
from supabase import create_client, Client

# --- 1. PEGA TUS CREDENCIALES AQUÍ ---
SUPABASE_URL = "https://vwlznsmwisdugpkftenc.supabase.co"
SUPABASE_KEY = "sb_publishable_5zcsjg-ubIcHNyohk5VwCQ_dX2D6Bp1"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
VAULT_FILE = "beats_history_vault.json"

def migrate_data():
    if not os.path.exists(VAULT_FILE):
        print(f"No se encontró {VAULT_FILE}")
        return

    with open(VAULT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    tickets = data.get("tickets", [])
    rules = data.get("learningLogs", [])

    print(f"Migrando {len(tickets)} Beats y {len(rules)} Reglas a Supabase...")

    # Función auxiliar para enviar datos en pequeños lotes de 100 en 100
    def upload_in_batches(table_name, items, batch_size=100):
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            payloads = []
            for item in batch:
                item_id = str(item.get("id", ""))
                # Generar ID seguro si no existe (principalmente para las reglas viejas)
                if not item_id and table_name == "draftea_rules":
                     item_id = f"rule_{i}_{item.get('clubCode', 'misc')}_{len(payloads)}"
                     item["id"] = item_id
                
                if item_id:
                     payloads.append({
                         "id": item_id,
                         "payload": item
                     })
            
            if payloads:
                try:
                    supabase.table(table_name).upsert(payloads).execute()
                    print(f"Subidos {len(payloads)} registros a {table_name} (Lote {i//batch_size + 1})")
                except Exception as e:
                    print(f"Error subiendo lote a {table_name}: {e}")

    print("Iniciando subida de Tickets...")
    upload_in_batches("draftea_tickets", tickets)
    print("✅ Tickets migrados con éxito.")

    print("Iniciando subida de Reglas...")
    upload_in_batches("draftea_rules", rules)
    print("✅ Reglas migradas con éxito.")

if __name__ == "__main__":
    migrate_data()