import sqlite3

p = '/srv/ha/config/home-assistant_v2.db'
con = sqlite3.connect(p)
cur = con.cursor()

cur.execute('PRAGMA table_info(states)')
print('states cols:', [r[1] for r in cur.fetchall()])
cur.execute('PRAGMA table_info(states_meta)')
print('states_meta cols:', [r[1] for r in cur.fetchall()])

cur.execute(
    """
    SELECT metadata_id, entity_id
    FROM states_meta
    WHERE lower(entity_id) LIKE '%bt7%'
       OR lower(entity_id) LIKE '%hot%water%'
       OR lower(entity_id) LIKE '%f730%'
    ORDER BY metadata_id DESC
    LIMIT 100
    """
)
rows = cur.fetchall()
print('matches:', len(rows))
for metadata_id, entity_id in rows:
    print(metadata_id, entity_id)

# Print latest values for likely BT7 candidates
for metadata_id, entity_id in rows:
    if 'bt7' in entity_id.lower() or ('hot' in entity_id.lower() and 'top' in entity_id.lower()):
        cur.execute(
            """
            SELECT state, last_updated_ts
            FROM states
            WHERE metadata_id = ?
            ORDER BY state_id DESC
            LIMIT 1
            """,
            (metadata_id,),
        )
        latest = cur.fetchone()
        print('LATEST', entity_id, latest)

con.close()
