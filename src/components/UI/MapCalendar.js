import { useState } from 'react';
import Calendar from 'react-calendar'; // npm install react-calendar
import 'react-calendar/dist/Calendar.css';
//import './MapCalendar.css';

function MapCalendar({ onDateChange }) {
  const [date, setDate] = useState(new Date());

  const handleChange = (newDate) => {
    setDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  return (
    <div className="map-calendar">
      <Calendar onChange={handleChange} value={date} locale="ru-RU" calendarType="iso8601" />
    </div>
  );
}

export default MapCalendar;
