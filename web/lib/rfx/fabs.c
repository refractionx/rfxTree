#include <math.h>

double fabs(double x)
{
	return *(((int *) &x) + 1) &= 0x7fffffff;
}
