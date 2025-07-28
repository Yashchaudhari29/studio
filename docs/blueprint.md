# **App Name**: Jal Seva Kendra

## Core Features:

- Dashboard Overview: Dashboard with key metrics (total supply hours, revenue) and recent activity.
- Customer Management: Customer management (CRUD operations, payment history, summaries).
- Automated Water Entry and Reporting: Water supply entry with automatic charge calculation and reporting.  The LLM acts as a tool to help determine anomalies in the data such as unusually long watering times that should be reviewed by the user for accuracy.

## Style Guidelines:

- Primary color: Blue (#3498db) for a professional and trustworthy feel.
- Secondary color: White for clean backgrounds and readability.
- Accent: Green (#2ecc71) for positive actions and success states (e.g., successful payment).
- Simple and clear sans-serif font (like Arial) for easy readability, especially on mobile devices.
- Use clear and intuitive icons for navigation and actions. Ensure icons are easily understandable by all users.
- Clean and organized layout with clear sections and spacing.  Prioritize important information and actions.

## Original User Request:
I need to develop a "Water Hishab" mobile application for borewell water management using React Native. The app will help rural farmers track water supply schedules, manage customer information, record payments, and generate reports for water supplied to agricultural fields.

## App Design and Functionality
The design is already created in Figma with the following key screens:

### 1. Main Dashboard Screen
- Header with "Water Hishab Dashboard" title
- Quick stats showing:
  - Today's total water supply hours (e.g., "14 Hours")
  - Today's total revenue (e.g., "₹2,800")
- Recent water supply activity list showing:
  - Customer name
  - Time slot (e.g., "3:00-5:00 PM")
  - Crop type
  - Amount charged
- Bottom navigation with four tabs:
  - Home
  - Add Entry
  - Customers
  - Reports

### 2. New Water Supply Entry Screen
- Form with the following fields:
  - Customer name (dropdown selection)
  - Date (with date picker)
  - Start time (with time picker)
  - End time (with time picker) 
  - Crop type (dropdown selection)
  - Save Entry button
- The app should automatically calculate the amount based on duration and crop type

### 3. Customer Details Screen
- Customer information:
  - Name
  - Mobile number
  - Village
- Financial summary showing:
  - Total paid amount
  - Pending amount
- Water supply history table with columns:
  - Date
  - Time
  - Duration (hours)
  - Crop
  - Amount
- Action buttons:
  - Export to Excel
  - Record Payment

### 4. Customer Report Screen
- Customer selection dropdown
- Date range selection (start and end date)
- Excel-like table showing:
  - Date
  - Time
  - Hours
  - Crop
  - Amount
- Export functionality

## Technical Requirements

### 1. Core Technologies
- React Native for cross-platform mobile development
- Firebase/Firestore for database
- React Navigation for screen navigation
- AsyncStorage or Realm for local storage backup
- React Native Paper or similar UI component library

### 2. Data Structure
- Customers collection:
  - id
  - name
  - mobile
  - village
  - totalPaid
  - pendingAmount
- Water Supply Entries collection:
  - id
  - customerId
  - date
  - startTime
  - endTime
  - durationHours
  - cropType
  - amount
  - isPaid

### 3. Key Functionality
- User authentication for the app owner
- CRUD operations for customers
- CRUD operations for water supply entries
- Automatic calculation of water supply duration and charges
- Daily statistics calculation
- Data export to Excel/CSV
- Payment recording
- Offline functionality with local data sync when online

### 4. UI/UX Requirements
- Match the Figma design exactly
- Use a color scheme with primarily blue (#3498db) and white
- Simple and intuitive UI for farmers to use easily
- Support for English and potentially Hindi language
- Clear typography with Arial or similar sans-serif font
- Proper form validation messages
- Loading indicators for async operations

### 5. Additional Features
- Data backup and restore functionality
- WhatsApp integration to send payment receipts
- Push notifications for payment reminders
- Color coding for paid/pending entries
- Reports filtering by crop type, customer, date range
- Quick actions for frequent tasks

## Development Process
Please develop this app step by step:

1. Set up the React Native project structure
2. Implement Firebase/Firestore integration
3. Create core data models and services
4. Build the UI components following the Figma design
5. Implement the business logic for calculations
6. Add authentication and security features
7. Implement offline functionality
8. Add export and reporting features
9. Test thoroughly on both Android and iOS
10. Optimize performance and handle edge cases

Please provide regular code samples and explain your implementation choices. Focus on creating a clean, maintainable codebase with proper documentation.

## Target Users
Rural farmers who manage borewell water supply to other farmers in their village. They typically charge by the hour based on crop type and need to keep track of water supply schedules and payments.

## Timeline
Please provide an estimated timeline for developing this application with major milestones.
  