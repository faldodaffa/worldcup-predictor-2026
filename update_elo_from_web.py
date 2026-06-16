import urllib.request
import json
import os
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Fetch team codes
print("Fetching team codes...")
resp = urllib.request.urlopen("https://www.eloratings.net/en.teams.tsv", context=ctx)
teams_tsv = resp.read().decode('utf-8')

code_to_name = {}
for line in teams_tsv.split('\n'):
    if not line.strip(): continue
    parts = line.split('\t')
    code = parts[0].strip()
    name = parts[1].strip()
    code_to_name[code] = name

# 2. Fetch World TSV
print("Fetching World TSV...")
resp = urllib.request.urlopen("https://www.eloratings.net/World.tsv", context=ctx)
world_tsv = resp.read().decode('utf-8')

name_to_elo = {}
for line in world_tsv.split('\n'):
    if not line.strip(): continue
    parts = line.split('\t')
    if len(parts) > 3:
        code = parts[2].strip()
        elo_val = int(parts[3].strip())
        team_name = code_to_name.get(code, code)
        name_to_elo[team_name] = elo_val

# 3. Read our current elo_ratings.json
with open('elo_ratings.json', 'r') as f:
    current_elo = json.load(f)

# Manually map some specific names if they differ
name_mapping = {
    "Czechia": ["Czech Republic", "Czechia"],
    "South Korea": ["South Korea", "Korea Republic"],
    "United States": ["United States", "USA", "US"],
    "Curacao": ["Curaçao", "Curacao"],
    "Cape Verde": ["Cape Verde Islands", "Cape Verde"],
    "Congo DR": ["DR Congo", "Congo DR", "Zaire"]
}

updated_elo = {}
for team in current_elo.keys():
    # Try exact match
    if team in name_to_elo:
        updated_elo[team] = name_to_elo[team]
    else:
        # Try mapped match
        found = False
        if team in name_mapping:
            for alias in name_mapping[team]:
                if alias in name_to_elo:
                    updated_elo[team] = name_to_elo[alias]
                    found = True
                    break
        if not found:
            # Try fuzzy
            for k, v in name_to_elo.items():
                if team.lower() in k.lower() or k.lower() in team.lower():
                    updated_elo[team] = v
                    found = True
                    break
        if not found:
            print(f"WARNING: Could not find live Elo for {team}, keeping old value.")
            updated_elo[team] = current_elo[team]

with open('elo_ratings.json', 'w') as f:
    json.dump(updated_elo, f, indent=2)

print("elo_ratings.json updated successfully!")
