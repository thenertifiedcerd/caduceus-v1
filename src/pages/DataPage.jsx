import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import WorkoutLogger from '../components/WorkoutLogger';
import HealthMetrics from '../components/HealthMetrics';

const DataPage = () => {
  return (
    <Container className="py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <header className="mb-5">
        <h1 className="display-5 fw-bold"><span className="brand-gradient-hover">Caduceus</span> <span className="text-primary">Dashboard</span></h1>
        <p className="text-muted">StayHealthy Inc. | Personal Health Intelligence</p>
      </header>

      <Row className="g-4">
        <Col lg={7}>
          <WorkoutLogger />
        </Col>
        <Col lg={5}>
          <HealthMetrics />
        </Col>
      </Row>
    </Container>
  );
};

export default DataPage;