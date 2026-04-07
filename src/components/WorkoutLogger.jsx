import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup } from 'react-bootstrap';
import { Search, Plus } from 'lucide-react';

const WorkoutLogger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');

  useEffect(() => {
    if (searchTerm.length > 2) {
      fetch(`https://wger.de/api/v2/exercise/search/?term=${searchTerm}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.suggestions || []))
        .catch(err => console.error(err));
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  return (
    <Card className="p-4 border-0 shadow-sm mb-4">
      <h3 className="mb-4">Log Session</h3>
      <Form>
        <Form.Group className="mb-3 position-relative">
          <Form.Label><Search size={16} /> Search Exercise</Form.Label>
          <Form.Control 
            type="text" 
            placeholder="e.g. Pull-ups" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {suggestions.length > 0 && (
            <ListGroup className="position-absolute w-100 shadow-sm" style={{ zIndex: 1000 }}>
              {suggestions.map((item, index) => (
                <ListGroup.Item 
                  key={index} 
                  action 
                  onClick={() => {
                    setSelectedExercise(item.value);
                    setSearchTerm(item.value);
                    setSuggestions([]);
                  }}
                >
                  {item.value}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Form.Group>

        <div className="d-flex gap-2">
          <Form.Control type="number" placeholder="Reps" className="w-25" />
          <Form.Control type="number" placeholder="Sets" className="w-25" />
          <Button variant="dark" className="flex-grow-1">
            <Plus size={18} /> Save
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default WorkoutLogger;