import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, MessageSquare, BookOpen, Code, CheckCircle, ArrowRight, User } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Home | Devora';
  }, []);

  const handleGetStarted = () => {
    navigate('/chat');
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Brain className="w-6 h-6 text-indigo-500" />
            <span>Devora</span>
          </div>
          <button 
            onClick={handleGetStarted}
            className="px-5 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 rounded-full transition-colors"
          >
            Go to App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.2 }}
            className="flex flex-col items-start"
          >
            <motion.h1 
              variants={fadeUp}
              className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
            >
              Intelligence <br className="hidden lg:block"/>
              that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-green-400">acts.</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeUp}
              className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed"
            >
              Your AI assistant that doesn't just answer, but thinks, learns, and executes. Experience the next generation of conversational intelligence.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={handleGetStarted}
                className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-semibold flex items-center justify-center gap-2 transition-transform hover:scale-105"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
            
            <motion.p variants={fadeUp} className="text-sm text-slate-500 mt-6 font-medium">
              Built for students, developers, and thinkers.
            </motion.p>
          </motion.div>

          {/* Hero Chat Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden md:block"
          >
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 relative z-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="bg-slate-700/50 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                    Write a python script to monitor system usage.
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex-1">
                    <p className="mb-2">I'll create a system monitor using psutil. Here's the script:</p>
                    <div className="bg-slate-900/80 rounded-lg p-3 text-xs font-mono text-green-400">
                      import psutil<br/>
                      print(f"CPU: &#123;psutil.cpu_percent()&#125;%")
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-green-500 rounded-2xl blur opacity-20 -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">What Devora can do</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Powered by advanced AI models, tailored for a specialized experience.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, title: 'Smart Conversations', desc: 'Context-aware responses that remember your past interactions.' },
              { icon: User, title: 'Multiple Personalities', desc: 'Switch between Teacher, Friend, and Mentor modes instantly.' },
              { icon: Zap, title: 'Agentic AI Actions', desc: 'Not just a chatbot. Devora performs tasks and executes commands.' },
              { icon: BookOpen, title: 'Academic & Coding Help', desc: 'Deep knowledge base designed to help you study and write better code.' },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl hover:border-indigo-500/50 transition-colors"
              >
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How Devora works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-0" />
            
            {[
              { step: '01', title: 'Ask Anything', desc: 'Type your question, code snippet, or upload a problem.' },
              { step: '02', title: 'Contextual Understanding', desc: 'Devora analyzes the intent and adapts to your selected personality.' },
              { step: '03', title: 'Intelligent Results', desc: 'Receive rich, formatted, and actionable responses.' },
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-slate-900 border-2 border-indigo-500/30 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-400 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-slate-400 max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built for you</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
              <BookOpen className="w-10 h-10 text-indigo-400 mb-6 relative z-10" />
              <h3 className="text-2xl font-bold mb-4 relative z-10">Students</h3>
              <ul className="space-y-3 relative z-10">
                {['Interactive learning', 'Exam preparation', 'Note summarization'].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <BookOpen className="w-48 h-48" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/20 p-8 rounded-3xl relative overflow-hidden group hover:border-green-500/40 transition-colors">
              <Code className="w-10 h-10 text-green-400 mb-6 relative z-10" />
              <h3 className="text-2xl font-bold mb-4 relative z-10">Developers</h3>
              <ul className="space-y-3 relative z-10">
                {['Code generation', 'Debugging assistance', 'Architecture planning'].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <Code className="w-48 h-48" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/20 p-8 rounded-3xl relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <Zap className="w-10 h-10 text-purple-400 mb-6 relative z-10" />
              <h3 className="text-2xl font-bold mb-4 relative z-10">Curious Learners</h3>
              <ul className="space-y-3 relative z-10">
                {['Deep dives into topics', 'Simplified explanations', 'Fact checking'].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <Brain className="w-48 h-48" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Preview */}
      <section className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-50">Devora</h3>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900 to-slate-900 min-h-[300px]">
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                  Explain binary search.
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[85%] text-slate-200 text-sm leading-relaxed">
                  <p className="mb-3">Sure, let's break it down step by step.</p>
                  <p className="mb-3">Imagine you have a dictionary and you want to find the word <strong>"Monkey"</strong>. Instead of reading every single page from the beginning, you open the book right in the <strong>middle</strong>.</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-300">
                    <li>If you open to "M", you found it!</li>
                    <li>If you open to "H", you know "M" comes later, so you ignore the first half of the book.</li>
                    <li>If you open to "P", you know "M" comes earlier, so you ignore the second half.</li>
                  </ul>
                  <p className="mt-4 text-xs text-slate-400 italic flex items-center gap-2">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></span>
                    </span>
                    Generating more examples...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[150px] -z-10" />
        <h2 className="text-4xl md:text-5xl font-bold mb-8 max-w-2xl mx-auto leading-tight">
          Start your AI journey with Devora today.
        </h2>
        <button 
          onClick={handleGetStarted}
          className="px-10 py-5 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-[0_0_40px_rgba(34,197,94,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(34,197,94,0.4)]"
        >
          Get Started Free
        </button>
      </section>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Devora AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
