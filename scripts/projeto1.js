// Mobile Navigation Toggle
const navSlide = () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');

  // Toggle Nav
  burger.addEventListener('click', () => {
    nav.classList.toggle('nav-active');
    burger.classList.toggle('toggle');
    
    // Animate Links
    navLinks.forEach((link, index) => {
      if (link.style.animation) {
        link.style.animation = '';
      } else {
        link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
      }
    });
  });
}

// Accordion Functionality
const initAccordion = () => {
  const accordionButtons = document.querySelectorAll('.accordion-button');
  
  accordionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const content = button.nextElementSibling;
      const icon = button.querySelector('.accordion-icon');
      
      // Toggle content
      if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.textContent = '+';
      } else {
        content.style.display = 'block';
        icon.textContent = '-';
      }
    });
  });
}

// Option Cards Interaction
const enhanceOptionCards = () => {
  const optionCards = document.querySelectorAll('.option-card');
  
  optionCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px)';
      card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    });
  });
}

// Smooth scrolling for anchor links
const initSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Highlight current section in navigation based on scroll position
const updateNavHighlight = () => {
  const sections = document.querySelectorAll('section[id]');
  
  window.addEventListener('scroll', () => {
    let scrollPosition = window.scrollY + 200;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        document.querySelector(`.nav-links a[href="#${sectionId}"]`)?.classList.add('active');
      } else {
        document.querySelector(`.nav-links a[href="#${sectionId}"]`)?.classList.remove('active');
      }
    });
  });
}

// Add animation to roadmap steps on scroll
const animateRoadmap = () => {
  const roadmapSteps = document.querySelectorAll('.roadmap-step');
  
  const checkScroll = () => {
    roadmapSteps.forEach(step => {
      const stepPosition = step.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.3;
      
      if (stepPosition < screenPosition) {
        step.classList.add('show');
        step.style.opacity = '1';
        step.style.transform = 'translateY(0)';
      }
    });
  }
  
  // Set initial styles
  roadmapSteps.forEach(step => {
    step.style.opacity = '0';
    step.style.transform = 'translateY(20px)';
    step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });
  
  window.addEventListener('scroll', checkScroll);
  // Check on initial load
  checkScroll();
}

// Copy prompt text to clipboard
const initPromptCopy = () => {
  const promptCards = document.querySelectorAll('.prompt-card');
  
  promptCards.forEach(card => {
    const promptText = card.querySelector('.prompt-content p').textContent;
    
    card.addEventListener('click', () => {
      navigator.clipboard.writeText(promptText)
        .then(() => {
          // Show copy success message
          const successMsg = document.createElement('div');
          successMsg.textContent = 'Prompt copiado!';
          successMsg.style.position = 'absolute';
          successMsg.style.bottom = '10px';
          successMsg.style.right = '10px';
          successMsg.style.backgroundColor = '#28a745';
          successMsg.style.color = 'white';
          successMsg.style.padding = '5px 10px';
          successMsg.style.borderRadius = '4px';
          successMsg.style.opacity = '0';
          successMsg.style.transition = 'opacity 0.3s';
          
          card.style.position = 'relative';
          card.appendChild(successMsg);
          
          setTimeout(() => {
            successMsg.style.opacity = '1';
          }, 10);
          
          setTimeout(() => {
            successMsg.style.opacity = '0';
            setTimeout(() => {
              card.removeChild(successMsg);
            }, 300);
          }, 2000);
        })
        .catch(err => {
          console.error('Erro ao copiar o prompt: ', err);
        });
    });
    
    // Add hover effect to indicate the card is clickable
    card.style.cursor = 'pointer';
    card.querySelector('.prompt-content').insertAdjacentHTML('beforeend', 
      '<p class="copy-hint" style="margin-top: 10px; font-size: 0.8rem; color: #666;">Clique para copiar o prompt</p>');
  });
}

// Initialize all functions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  initAccordion();
  enhanceOptionCards();
  initSmoothScroll();
  updateNavHighlight();
  animateRoadmap();
  initPromptCopy();
});
