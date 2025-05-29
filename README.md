# India Violence Tracker

A near-real-time dashboard that tracks and visualizes violence incidents across India by scraping RSS feeds, classifying news articles using LLM, and displaying data on an interactive map.

## 🎯 Features

- **Real-time Data Collection**: Automated RSS feed scraping via Google Apps Script
- **AI-Powered Classification**: LLM-based article classification and data extraction
- **Interactive Map**: Leaflet.js map with incident markers and clustering
- **Data Visualization**: Charts showing state-wise and incident type distributions
- **Advanced Filtering**: Search, filter by state, incident type, and date
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Manual Verification**: Workflow for human verification of AI-classified data

## 🛠️ Tech Stack

### Backend
- **Google Apps Script**: RSS feed processing and data pipeline
- **Google Sheets**: Data storage (IncidentData, PublicData, feeds)
- **LLM Integration**: Article classification and data extraction

### Frontend
- **HTML/CSS/JavaScript**: Vanilla frontend with modern ES6 modules
- **Leaflet.js**: Interactive mapping with marker clustering
- **Chart.js**: Data visualization charts
- **Tailwind CSS**: Utility-first CSS framework
- **GitHub Pages**: Static site hosting

### Deployment
- **GitHub Actions**: Automated CI/CD pipeline
- **Tailwind CSS Build**: Automated CSS compilation

## 📁 Project Structure

```
india-violence-tracker/
├── docs/                     # GitHub Pages site
│   ├── index.html           # Main dashboard page
│   ├── css/
│   │   ├── input.css        # Tailwind input file
│   │   └── style.css        # Compiled CSS
│   ├── js/
│   │   ├── app.js           # Main application controller
│   │   ├── data.js          # Data management module
│   │   ├── map.js           # Leaflet map module
│   │   ├── charts.js        # Chart.js charts module
│   │   └── table.js         # Data table module
│   └── assets/              # Images and icons
├── appscript/
│   └── Code.gs              # Google Apps Script backend
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions deployment
├── package.json             # Node.js dependencies
└── tailwind.config.js       # Tailwind configuration
```

## 🚀 Setup Instructions

### 1. Google Apps Script Setup

1. Open [Google Apps Script](https://script.google.com/)
2. Create a new project named "India Violence Tracker"
3. Replace `Code.gs` content with `/appscript/Code.gs`
4. Create a Google Sheet with tabs: `feeds`, `IncidentData`, `PublicData`
5. Set up the following triggers:
   - `processFeeds`: Time-driven, every 30 minutes
   - `onEdit`: On edit trigger for manual verification

### 2. Google Sheets Setup

#### Feeds Tab
| Column A | Column B | Column C |
|----------|----------|----------|
| Feed Name | RSS URL | Active |
| Example Feed | https://example.com/rss | TRUE |

#### RSS Feed Sources
Add these RSS feeds to get started:
- Times of India Crime: `https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms`
- The Hindu National: `https://www.thehindu.com/news/national/feeder/default.rss`
- Indian Express India: `https://indianexpress.com/section/india/feed/`
- NDTV India: `https://feeds.feedburner.com/ndtv/India`

### 3. Frontend Deployment

The site automatically deploys to GitHub Pages on push to main branch.

**Manual Setup:**
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. The `.github/workflows/deploy.yml` handles automatic deployment

### 4. Local Development

```bash
# Clone repository
git clone <repository-url>
cd india-violence-tracker

# Install dependencies
npm install

# Build CSS
npm run build

# Serve locally
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

## 📊 Data Schema

### Incident Data Fields
- `headline`: Article headline
- `summary`: Brief description
- `incidentDate`: Date of incident (YYYY-MM-DD)
- `publishedAt`: Article publication timestamp
- `lat`, `lon`: Geographic coordinates
- `location`: Specific location name
- `district`: District name
- `state`: State name
- `victimGroup`: Affected community
- `incidentType`: Type of violence
- `allegedPerp`: Alleged perpetrator
- `policeAction`: Police response
- `sourceUrl`: Original article URL
- `sourceName`: News source name
- `rssFeedId`: Source RSS feed
- `confidenceScore`: AI classification confidence
- `verifiedManually`: Human verification status

## 🔧 Configuration

### LLM Integration
Currently using a stub implementation. To integrate with real LLM:

1. Replace the `classifyWithLLM` function in `Code.gs`
2. Add your LLM API endpoint and authentication
3. Update the prompt for incident classification

### Data Sources
Add RSS feeds in the Google Sheets `feeds` tab:
- Set `Active` to `TRUE` to enable processing
- The system processes feeds in round-robin fashion

### GitHub Pages URL
Update the Google Sheets published JSON URL in `docs/js/data.js`:
```javascript
// Replace with your actual Google Sheets JSON URL
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:json&sheet=public_json_data';
```

## 🔄 Workflow

### Data Pipeline
1. **RSS Parsing**: Google Apps Script fetches articles from RSS feeds
2. **LLM Classification**: AI determines if article is violence-related
3. **Data Extraction**: Extract incident details (location, type, victims)
4. **Storage**: Save to Google Sheets with confidence scores
5. **Manual Review**: Human verification of AI classifications
6. **Publication**: Verified data published to public JSON endpoint
7. **Frontend Update**: Dashboard automatically fetches latest data

### Manual Verification
1. Unverified incidents appear with confidence scores
2. Editors can mark incidents as verified/rejected
3. Only verified incidents appear on public dashboard
4. Verification status tracked in `verifiedManually` field

## 📈 Analytics & Monitoring

### Dashboard Metrics
- Weekly incident count
- Monthly incident count
- Total incidents tracked
- Most affected state
- Incident type distribution
- Geographic distribution

### Data Quality
- Confidence scores for AI classifications
- Manual verification rates
- Source coverage and reliability
- Geographic coverage analysis

## 🛡️ Security & Privacy

### Data Protection
- No personal information stored
- Focus on incident patterns, not individuals
- Source attribution maintained for transparency
- Privacy-first approach to sensitive data

### Content Moderation
- Human verification required for publication
- Confidence thresholds for automated processing
- Regular review of classification accuracy
- Source credibility assessment

## 🔧 Troubleshooting

### Common Issues

**Maps not loading:**
- Check console for JavaScript errors
- Verify Leaflet.js CDN availability
- Ensure geographic coordinates are valid

**Data not updating:**
- Check Google Apps Script execution logs
- Verify RSS feed accessibility
- Check Google Sheets permissions

**Charts not rendering:**
- Ensure Chart.js is loaded
- Check data format and field names
- Verify canvas elements exist in DOM

## 🚀 Next Steps

### Phase 1: Complete Basic Integration
- [x] Update field names across all modules
- [x] Test complete data flow
- [ ] Deploy to production
- [ ] Set up real RSS feeds
- [ ] Configure Google Sheets public JSON

### Phase 2: Enhanced Features
- [ ] Replace stub LLM with real API
- [ ] Add email notifications for critical incidents
- [ ] Implement data export functionality
- [ ] Add incident trending analysis
- [ ] Mobile app development

### Phase 3: Advanced Analytics
- [ ] Predictive modeling
- [ ] Pattern recognition
- [ ] Automated reporting
- [ ] API for third-party integration
- [ ] Real-time alerts system

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Important**: This project deals with sensitive content related to violence. Please ensure responsible use and respect for affected communities.
