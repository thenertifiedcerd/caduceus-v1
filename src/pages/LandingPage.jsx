import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaTags, addStructuredData, organizationSchema, webApplicationSchema } from '../utils/seo';
import './LandingPage.css';

const LandingPage = () => {
	useEffect(() => {
		updateMetaTags({
			title: 'Caduceus - Track Workouts & Health Metrics',
			description: 'Personal health intelligence platform. Track workouts, monitor health metrics, and gain actionable insights for your fitness goals.',
			ogUrl: 'https://caduceus-v1.web.app',
		});

		// Add structured data
		addStructuredData(organizationSchema);
		addStructuredData(webApplicationSchema);

		return () => {
			// Cleanup if needed
		};
	}, []);
	return (
		<main className="landing-page">
			<section className="landing-shell">
				<header className="landing-header">
					<h2 className="landing-brand brand-gradient-hover">Caduceus</h2>
					<p className="landing-tagline">Personal health intelligence for training, trends, and better outcomes.</p>
				</header>

				<div className="landing-content">
					<section className="landing-hero-card">
						<span className="landing-badge">Built for active routines</span>
						<h1 className="landing-title">Track workouts. Understand your metrics. Move with confidence.</h1>
						<p className="landing-copy">
							Caduceus helps you log daily training, monitor health indicators, and spot meaningful changes over
							time. Keep your progress in one place and build habits you can sustain.
						</p>
						<div className="landing-cta-row">
							<Link to="/auth" className="landing-primary-cta">
								Get Started
							</Link>
							<p className="landing-secondary">Sign in or create your account in less than a minute.</p>
						</div>
					</section>

					<section className="landing-glance">
						<div className="landing-section-title">At a glance</div>
						<div className="landing-glance-grid">
							<article className="landing-card">
								<p className="landing-card-kicker">Workout consistency</p>
								<h3 className="landing-card-value">3x / week</h3>
								<p className="landing-card-copy">Build stable momentum with simple daily session logging.</p>
							</article>
							<article className="landing-card">
								<p className="landing-card-kicker">Metrics coverage</p>
								<h3 className="landing-card-value">Weight + Vitals</h3>
								<p className="landing-card-copy">Capture body signals in one place to support better training decisions.</p>
							</article>
							<article className="landing-card">
								<p className="landing-card-kicker">Nutrition context</p>
								<h3 className="landing-card-value">Meal logs</h3>
								<p className="landing-card-copy">Add food intake context so energy trends become easier to explain.</p>
							</article>
							<article className="landing-card">
								<p className="landing-card-kicker">Weekly intelligence</p>
								<h3 className="landing-card-value">Coach insights</h3>
								<p className="landing-card-copy">Get a concise weekly readout of progress and practical next actions.</p>
							</article>
						</div>
					</section>

					<section className="landing-features">
						<div className="landing-section-title">Core features</div>
						<div className="landing-features-grid">
							<article className="landing-feature-card">
								<h3 className="landing-card-title">Workout Logging</h3>
								<p className="landing-card-copy">Keep a clean history of sessions so consistency and performance trends become visible.</p>
							</article>
							<article className="landing-feature-card">
								<h3 className="landing-card-title">Health Metrics</h3>
								<p className="landing-card-copy">Capture key indicators in one dashboard to support informed training decisions.</p>
							</article>
							<article className="landing-feature-card">
								<h3 className="landing-card-title">Actionable Insights</h3>
								<p className="landing-card-copy">Pair activity with metrics to better understand your baseline and progress over time.</p>
							</article>
						</div>
					</section>
				</div>

				<footer className="landing-footer">StayHealthy Inc. | Caduceus Wellness Platform</footer>
			</section>
		</main>
	);
};

export default LandingPage;
