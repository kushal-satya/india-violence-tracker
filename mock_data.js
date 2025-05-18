const mockData = [
  {
    "Incident ID": "001",
    "Title": "Mock Incident in Delhi",
    "Date of Incident": "2024-05-15",
    "Location": "New Delhi",
    "State": "Delhi",
    "Victim Community": "Dalit",
    "Incident Type": "Physical Assault",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/1",
    "Latitude": "28.6139",
    "Longitude": "77.2090"
  },
  {
    "Incident ID": "002",
    "Title": "Mock Incident in Mumbai",
    "Date of Incident": "2024-05-10",
    "Location": "Mumbai",
    "State": "Maharashtra",
    "Victim Community": "Adivasi",
    "Incident Type": "Discrimination",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/2",
    "Latitude": "19.0760",
    "Longitude": "72.8777"
  },
  {
    "Incident ID": "003",
    "Title": "Mock Incident in Bangalore",
    "Date of Incident": "2024-05-12",
    "Location": "Bangalore",
    "State": "Karnataka",
    "Victim Community": "Dalit",
    "Incident Type": "Violence",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/3",
    "Latitude": "12.9716",
    "Longitude": "77.5946"
  },
  {
    "Incident ID": "004",
    "Title": "Mock Incident in Chennai",
    "Date of Incident": "2024-05-08",
    "Location": "Chennai",
    "State": "Tamil Nadu",
    "Victim Community": "Dalit",
    "Incident Type": "Harassment",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/4",
    "Latitude": "13.0827",
    "Longitude": "80.2707"
  },
  {
    "Incident ID": "005",
    "Title": "Mock Incident in Kolkata",
    "Date of Incident": "2024-05-05",
    "Location": "Kolkata",
    "State": "West Bengal",
    "Victim Community": "Minority",
    "Incident Type": "Discrimination",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/5",
    "Latitude": "22.5726",
    "Longitude": "88.3639"
  },
  {
    "Incident ID": "006",
    "Title": "Mock Incident in Hyderabad",
    "Date of Incident": "2024-05-03",
    "Location": "Hyderabad",
    "State": "Telangana",
    "Victim Community": "Dalit",
    "Incident Type": "Violence",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/6",
    "Latitude": "17.3850",
    "Longitude": "78.4867"
  },
  {
    "Incident ID": "007",
    "Title": "Mock Incident in Jaipur",
    "Date of Incident": "2024-05-01",
    "Location": "Jaipur",
    "State": "Rajasthan",
    "Victim Community": "Adivasi",
    "Incident Type": "Discrimination",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/7",
    "Latitude": "26.9124",
    "Longitude": "75.7873"
  },
  {
    "Incident ID": "008",
    "Title": "Mock Incident in Ahmedabad",
    "Date of Incident": "2024-04-28",
    "Location": "Ahmedabad",
    "State": "Gujarat",
    "Victim Community": "Minority",
    "Incident Type": "Physical Assault",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/8",
    "Latitude": "23.0225",
    "Longitude": "72.5714"
  },
  {
    "Incident ID": "009",
    "Title": "Mock Incident in Lucknow",
    "Date of Incident": "2024-04-25",
    "Location": "Lucknow",
    "State": "Uttar Pradesh",
    "Victim Community": "Dalit",
    "Incident Type": "Violence",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/9",
    "Latitude": "26.8467",
    "Longitude": "80.9462"
  },
  {
    "Incident ID": "010",
    "Title": "Mock Incident in Bhopal",
    "Date of Incident": "2024-04-20",
    "Location": "Bhopal",
    "State": "Madhya Pradesh",
    "Victim Community": "Adivasi",
    "Incident Type": "Harassment",
    "Source Name": "Test Source",
    "Source URL": "https://example.com/10",
    "Latitude": "23.2599",
    "Longitude": "77.4126"
  },
  {
    "Incident ID": "60fafeb1-480a-4223-ae9f-b6688992c591",
    "Title": "98 get life term for 2014 violence against Dalits in Karnataka - Times of India",
    "Date of Incident": "2014-01-15",
    "Location": "Karnataka",
    "State": "Karnataka",
    "Victim Community": "Dalit",
    "Incident Type": "Violence, Physical Assault",
    "Source Name": "Google News",
    "Source URL": "https://news.google.com/rss/articles/CBMiygFBVV95cUxQYnpOM29Id2paVWVSN0tSakl0TVlXUm5TYkJaOFlYYWR5UTUzQktYVi1WWlg1MWJYelFmYUxRY2pxMjFnVG5aUnVnT2liQjJIVFp2WWZDb0NYRVNId1UxQmc3M2ZuN2U0d2h4TWFYSWpJVHVhMllfOVprQ2pVN085Ul9zRXBxRGNuLUFmV2ZJSm1IdlRrWnJvZFZiOVVYcXhNNGZvdWtTNnA1M21BMS1NVTYtQ3lwNWRZcV9iN0JhY2xETmRuRnlyV0p30gHPAUFVX3lxTE9TeVF2a21ENk9vTkw1UUdDWm9adnVqcnFuYUhXeHBtcENYQ1dKc0J6aG9qakJoYjV6TWJkeWZ1enRjSUZ5SzdNaXAzVUdINVhPYkV5RFd5NVFONnkyTk1VUEtXMDlzRmFweUJQRC04YW1LSk9wc2lZaGl3SHFiVS1HbGozQlBER1Y3YXRobVZqQTh0UVRJVGVsUVpORk5nNGc4dmJCczdIeU5TRF9RVWwyd044alQtZnB6MVVsY3dxUDlHcmhxM2poVGMyOW9RYw?oc=5",
    "Latitude": "15.3173",
    "Longitude": "75.7139"
  },
  {
    "Incident ID": "131f7d08-2ceb-4023-97aa-5cdca29237a6",
    "Title": "NHRC takes suo motu cognisance over Dalit student's fingers chopped off by upper-caste boys in Thoothukudi - Maktoob Media",
    "Date of Incident": "2024-05-10",
    "Location": "Thoothukudi",
    "State": "Tamil Nadu",
    "Victim Community": "Dalit",
    "Incident Type": "Physical Assault, Hate Crime",
    "Source Name": "Google News",
    "Source URL": "https://news.google.com/rss/articles/CBMi4wFBVV95cUxNampSYkJRbkxhUUM2eU9BSHFzX3dBNkFPek1GWGRpNzZnenNXMzFuRWpVS1MyVlBEelJZNkNTM1QzTjQyZGZWUzM0WWp1Q2h6X3hEbjVINVNrc2g0NDFGYS1rdDJSWC1ZdTJuZUpLdjlWMjl3bVpQRWw5YXgzSXN2UTBFSWZIalNDeG9wMi1EVWI2SG5XMDg1SW5qd05hT0FOMElrLVN0ajYxUldDaXBsbHlnak5HY0djZTRDWjVWS2ItWjMydWFSYUFydjJhdjl0TlhLM0dEejhWSnpleWFfbjNqQQ?oc=5",
    "Latitude": "8.7642",
    "Longitude": "78.1348"
  }
];

// Export the mock data
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockData;
} 