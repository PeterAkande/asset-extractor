import './TestimonialSection.css';

const TestimonialSection = () => {
  const testimonials = [
    {
      id: 1,
      quote: "AssetX has saved me countless hours of design work. Now I can easily extract color palettes and fonts from any website for inspiration.",
      name: "Sarah Johnson",
      title: "UI/UX Designer",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      id: 2,
      quote: "As a developer, I often need to match designs exactly. This tool makes it simple to identify the exact colors and assets used on a website.",
      name: "Michael Chen",
      title: "Frontend Developer",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      id: 3,
      quote: "Our design team uses AssetX daily for competitive analysis. It's become an essential part of our workflow.",
      name: "Emma Rodriguez",
      title: "Creative Director",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg"
    }
  ];

  return (
    <section id="testimonials" className="testimonials-section">
      <div className="container">
        <div className="section-title">
          <h2>What Our Users Say</h2>
          <p>Thousands of designers and developers trust AssetX for their design inspiration needs.</p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map(testimonial => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-quote">"{testimonial.quote}"</div>
              <div className="testimonial-author">
                <img src={testimonial.avatar} alt={testimonial.name} className="testimonial-avatar" />
                <div className="testimonial-info">
                  <div className="testimonial-name">{testimonial.name}</div>
                  <div className="testimonial-title">{testimonial.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
