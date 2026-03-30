import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeIn)),
    );

    _glowAnimation = Tween<double>(begin: 0.0, end: 30.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _controller.forward();
    
    // Looping glow effect
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        // You could add a separate controller for continuous glow, 
        // but for a splash, one-time entry is usually enough.
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFE0F2FE), // Very light blue
              Colors.white,
            ],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background Glow
            AnimatedBuilder(
              animation: _glowAnimation,
              builder: (context, child) {
                return Container(
                  width: 280,
                  height: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF60A5FA).withValues(alpha: 0.3),
                        blurRadius: _glowAnimation.value + 40,
                        spreadRadius: _glowAnimation.value,
                      ),
                    ],
                  ),
                );
              },
            ),
            
            // Central Circle with Logo
            ScaleTransition(
              scale: _scaleAnimation,
              child: FadeTransition(
                opacity: _opacityAnimation,
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // HEARTLY Logo Drawing
                      const HeartlyLogo(),
                      const SizedBox(height: 12),
                      Text(
                        'HEARTLY',
                        style: GoogleFonts.poppins(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0EA5E9),
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'С сердечной заботой о Вас!',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HeartlyLogo extends StatelessWidget {
  const HeartlyLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 80,
      height: 60,
      child: CustomPaint(
        painter: HeartlyLogoPainter(),
      ),
    );
  }
}

class HeartlyLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // Drawing a full heart
    final path = Path();
    path.moveTo(width / 2, height / 4);
    
    // Top left curve
    path.cubicTo(
      width / 4, 0, 
      0, height / 4, 
      0, height / 2,
    );
    
    // Bottom left curve
    path.cubicTo(
      0, height * 3 / 4, 
      width / 2, height, 
      width / 2, height,
    );
    
    // Bottom right curve
    path.cubicTo(
      width / 2, height, 
      width, height * 3 / 4, 
      width, height / 2,
    );
    
    // Top right curve
    path.cubicTo(
      width, height / 4, 
      width * 3 / 4, 0, 
      width / 2, height / 4,
    );

    final paint1 = Paint()
      ..color = const Color(0xFF0EA5E9).withValues(alpha: 0.3)
      ..style = PaintingStyle.fill;
    
    canvas.drawPath(path, paint1);

    // Inner smaller heart for accent
    final innerPath = Path();
    final scale = 0.7;
    final dx = width * (1 - scale) / 2;
    final dy = height * (1 - scale) / 2;
    
    innerPath.moveTo(dx + (width * scale) / 2, dy + (height * scale) / 4);
    innerPath.cubicTo(dx + (width * scale) / 4, dy, dx, dy + (height * scale) / 4, dx, dy + (height * scale) / 2);
    innerPath.cubicTo(dx, dy + (height * scale) * 3 / 4, dx + (width * scale) / 2, dy + (height * scale), dx + (width * scale) / 2, dy + (height * scale));
    innerPath.cubicTo(dx + (width * scale) / 2, dy + (height * scale), dx + width * scale, dy + (height * scale) * 3 / 4, dx + width * scale, dy + (height * scale) / 2);
    innerPath.cubicTo(dx + width * scale, dy + (height * scale) / 4, dx + (width * scale) * 3 / 4, dy, dx + (width * scale) / 2, dy + (height * scale) / 4);

    final paint2 = Paint()
      ..color = const Color(0xFF0EA5E9)
      ..style = PaintingStyle.fill;
    
    canvas.drawPath(innerPath, paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
