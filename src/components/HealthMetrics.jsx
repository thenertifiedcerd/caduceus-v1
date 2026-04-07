import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';
import { Ruler, Scale, HeartPulse, Calendar } from 'lucide-react';

// Biometric info goes here

const HealthMetrics = () => {
  return (
    <Card className="border-0 shadow-sm p-4">
      <h4 className="mb-4 d-flex align-items-center">
        <HeartPulse className="text-danger me-2" /> Biometric Profile
      </h4>
      <Form>
        <Row className="mb-3">
          <Col>
            <Form.Label><Calendar size={14} /> Age</Form.Label>
            <Form.Control type="number" defaultValue="21" />
          </Col>
          <Col>
            <Form.Label><Ruler size={14} /> Height (cm)</Form.Label>
            <Form.Control type="number" defaultValue="180" />
          </Col>
        </Row>
        
        <Form.Group className="mb-3">
          <Form.Label><Scale size={14} /> Current Weight (kg)</Form.Label>
          <Form.Control type="number" step="0.1" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Health Records</Form.Label>
          <Form.Control as="textarea" rows={3} />
        </Form.Group>
      </Form>
    </Card>
  );
};

export default HealthMetrics;