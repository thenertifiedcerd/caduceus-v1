import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
	return (
		<main className="landing-page">
			<section className="landing-shell">
				<header className="landing-header">
					<h2 className="landing-brand brand-gradient-hover">Caduceus</h2>
					<p className="landing-tagline">Personal health intelligence for training, trends, and better outcomes.</p>
				</header>

				<div className="landing-hero-wrap">
					<div className="landing-left">
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
					</div>

					<aside className="landing-highlights">
						<article className="landing-card">
							<h3 className="landing-card-title">Workout Logging</h3>
							<p className="landing-card-copy">
								Keep a clean history of sessions so consistency and performance trends become visible.
							</p>
						</article>
						<article className="landing-card">
							<h3 className="landing-card-title">Health Metrics</h3>
							<p className="landing-card-copy">
								Capture key indicators in one dashboard to support informed training decisions.
							</p>
						</article>
						<article className="landing-card">
							<h3 className="landing-card-title">Actionable Insights</h3>
							<p className="landing-card-copy">
								Pair activity with metrics to better understand your baseline and progress over time.
							</p>
						</article>
					</aside>
				</div>

				<footer className="landing-footer">StayHealthy Inc. | Caduceus Wellness Platform</footer>
			</section>
		</main>
	);
};

export default LandingPage;
