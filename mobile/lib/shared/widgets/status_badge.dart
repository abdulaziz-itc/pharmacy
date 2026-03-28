import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool small;

  const StatusBadge({
    super.key,
    required this.status,
    this.small = false,
  });

  Color get _backgroundColor {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'kutilmoqda':
        return AppColors.statusPending.withOpacity(0.15);
      case 'approved':
      case 'tasdiqlangan':
        return AppColors.statusApproved.withOpacity(0.15);
      case 'cancelled':
      case 'bekor qilingan':
        return AppColors.statusCancelled.withOpacity(0.15);
      case 'completed':
      case 'yakunlangan':
        return AppColors.statusCompleted.withOpacity(0.15);
      case 'active':
      case 'faol':
        return AppColors.statusApproved.withOpacity(0.15);
      case 'inactive':
        return AppColors.statusCancelled.withOpacity(0.15);
      case 'unread':
        return AppColors.accent.withOpacity(0.15);
      case 'read':
        return AppColors.textHint.withOpacity(0.15);
      default:
        return AppColors.textHint.withOpacity(0.15);
    }
  }

  Color get _textColor {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'kutilmoqda':
        return AppColors.statusPending;
      case 'approved':
      case 'tasdiqlangan':
        return AppColors.statusApproved;
      case 'cancelled':
      case 'bekor qilingan':
        return AppColors.statusCancelled;
      case 'completed':
      case 'yakunlangan':
        return AppColors.statusCompleted;
      case 'active':
      case 'faol':
        return AppColors.statusApproved;
      case 'inactive':
        return AppColors.statusCancelled;
      case 'unread':
        return AppColors.accent;
      case 'read':
        return AppColors.textHint;
      default:
        return AppColors.textSecondary;
    }
  }

  String get _displayText {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Kutilmoqda';
      case 'approved':
        return 'Tasdiqlangan';
      case 'cancelled':
        return 'Bekor qilingan';
      case 'completed':
        return 'Yakunlangan';
      case 'active':
        return 'Faol';
      case 'inactive':
        return 'Nofaol';
      case 'unread':
        return 'O\'qilmagan';
      case 'read':
        return 'O\'qilgan';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 8 : 10,
        vertical: small ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: small ? 5 : 6,
            height: small ? 5 : 6,
            decoration: BoxDecoration(
              color: _textColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            _displayText,
            style: GoogleFonts.inter(
              fontSize: small ? 10 : 12,
              fontWeight: FontWeight.w500,
              color: _textColor,
            ),
          ),
        ],
      ),
    );
  }
}
