import json
with open('elo_ratings.json', 'r') as f:
    elo = json.load(f)

elo['Spain'] = 2220
elo['France'] = 2100
elo['United States'] = 2020
elo['Morocco'] = 2000
elo['Curacao'] = 1750
elo['Haiti'] = 1720
elo['Cape Verde'] = 1720

with open('elo_ratings.json', 'w') as f:
    json.dump(elo, f, indent=2)
