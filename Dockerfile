# Gunakan base image yang sudah memuat Python dan Node.js
FROM nikolaik/python-nodejs:python3.11-nodejs20

# Set direktori kerja
WORKDIR /app

# Copy daftar dependensi package.json
COPY package*.json ./

# Install dependensi Node.js
RUN npm install

# Copy daftar dependensi Python
COPY requirements.txt ./

# Install dependensi Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh file aplikasi ke dalam container
COPY . .

# Expose port (Render akan me-map port ini secara otomatis, tapi kita tetap deklarasikan)
EXPOSE 3000

# Perintah untuk menjalankan server
CMD ["npm", "start"]
