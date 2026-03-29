# Observability Platform

A full-stack, comprehensive web observability system designed to monitor frontend performance, track user behavior (interactions and unique visitors), and capture runtime errors seamlessly. The platform is composed of a lightweight browser telemetry SDK, a high-throughput backend log ingestion process, and a reporting dashboard built with role-based access control and native PDF report generation.

## Architecture

The project is structured into three specialized tiers, designed for scalability and reliability:

1. **`browser-telemetry-sdk`**
   - A robust, lightweight Vanilla JavaScript tracker designed to be injected into client sites
   - Captures vital frontend telemetry including page load performance, layout weight, console errors, user behavior, and unique interactions
2. **`ingestion`**
   - **`collector-api`**: A high-throughput Express backend that serves as the entry point for incoming telemetry payloads from the SDK
   - **`server-log-worker`**: A Node.js worker process that securely tails log files and dynamically pushes parsed metrics to the PostgreSQL database
3. **`reporting-system`**
   - Server-side rendered application that serves as the primary data visualization dashboard
   - Features rich visual data metrics, user role tiers, and robust PDF report generation

## Key Features

- **Extensive Dashboarding**: Real-time observability tracking divided into discrete tabs: *Performance, Behavioral, Audience, and Errors*
- **Role-Based Access Control (RBAC)**: Secure authentication integrated via JWT, offering categorized data access levels
  - **Super Admin**: Full permissions, system configuration, and deletion rights
  - **Analyst**: Standard access, capable of adding detailed commentary and generating exportable reports
  - **Viewer**: Read-only oversight access
- **PDF Report Generation**: Built natively using Puppeteer, authorized users can append deep analytical commentary to real-time visualizations and export fully formed, highly legible PDF reports directly to their local filesystem
- **Deep Data Insights**: 
  - Bar charts, line charts, pie charts, doughnut charts, heatmaps
  - Comprehensive "Top Pages" analytical table measuring unique visitors, element interactions, page load times, and distinct session errors
- **Premium User Experience**: Specifically engineered with a premium, robust, sleek dark-mode aesthetic

## Technologies Used

- **Browser Telemetry SDK**: Vanilla JavaScript
- **Backend Infrastructure**: Node.js, Express.js
- **Reporting Dashboard View Engine**: EJS
- **Data Persistence**: PostgreSQL
- **Utilities**: Puppeteer (headless PDF generation), bcrypt (hash security), JSON Web Tokens (authentication), `tail` (log parsing)

---

## Installation and Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js (v18.0.0 or higher)
- PostgreSQL Server

### 2. Environment Configuration
You must configure your connection settings for PostgreSQL across the reporting and ingestion containers. 

Create a `.env` file within the `reporting-system`, `ingestion/collector-api`, and `ingestion/server-log-worker` directories containing the following structures respectively:

**reporting-system / collector-api `.env` format:**
```bash
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DP_HOST=localhost
DB_PORT=5432
DB_NAME=your_postgres_db_name
PORT=your_port_1 # Or your_port_2 for collector-api
ALLOWED_ORIGINS=https://your-site-1.com,https://your-site-2.com
TRACKED_SITE_URL=https://your-site.com # Add this ONLY to reporting-system
JWT_SECRET=your_jwt_secret # Add this ONLY to reporting-system
```

**server-log-worker `.env` format:**
```bash
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DP_HOST=localhost
DB_PORT=5432
DB_NAME=your_postgres_db_name
LOG_FILE_PATH=/var/log/apache2/your-site.com-access.log
```

### 3. Database Initialization

From the `reporting-system` directory, safely initialize the PostgreSQL structure:

```bash
cd reporting-system
npm install
node setup-db.js
```
*Note: This script dynamically generates the core schema architectures (`browser_telemetry`, `server_logs`, `users`, `reports`) and provisions a default Super Admin account.*

### 4. Running the Platform

Once the database instances are running, launch the backend APIs and reporting hub independently:

Run the reporting system:
```bash
cd reporting-system
node app.js
```

Run the collector API:
```bash
cd ingestion/collector-api
npm install
node server.js
```

Run the server log worker:
```bash
cd ingestion/server-log-worker
npm install
node worker.js
```

### 5. Client Setup (Website Tracking)

To begin capturing frontend performance events and user behaviors, inject the browser telemetry SDK into the HTML of any site you wish to track.

Add the following `<script>` tags to your HTML document (ideally just before the closing `</body>` tag):

```html
<!-- Load the browser telemetry SDK -->
<script src="path/to/browser-telemetry-sdk/collector.js"></script>

<!-- Initialize the tracker with custom configuration -->
<script>
    if (typeof collector !== 'undefined') {
        collector.init({
            // The default endpoint points to the creator's hosted server.
            // Update this to point to your deployed collector-api instance:
            endpoint: 'http://localhost:3000/log', 
            
            // Select which specific behaviors you want to track:
            enableTechnographics: true, // Device & network info
            enableTiming: true,         // Page load timing
            enableVitals: true,         // Web vitals (LCP, CLS, INP)
            enableErrors: true,         // Console and resource errors
            enableActivity: true,       // Mouse movements, clicks, scrolls
            
            sampleRate: 1.0,            // 1.0 = 100% of sessions are tracked
            debug: false                // Set to true to view console logs instead of sending data
        });
    }
</script>
```

Navigate securely to `http://localhost:3001` to view your dashboard and analyze incoming events. 
