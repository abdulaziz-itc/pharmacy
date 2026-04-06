
import math

def test_rounding():
    # Simulate payment_bonus_amount rounding
    test_cases = [
        (1629657.738, 1629658.0),
        (714285.714, 714286.0),
        (76071.429, 76071.0),
        (8556.548, 8557.0),
        (54642.857, 54643.0),
    ]
    
    print("Testing float(round(x)):")
    for val, expected in test_cases:
        rounded = float(round(val))
        print(f"Original: {val} -> Rounded: {rounded} (Expected: {expected})")
        # Note: round(x.5) in Python rounds to nearest EVEN. 
        # But for these specific .738, .714 etc it should work as expected.

if __name__ == "__main__":
    test_rounding()
