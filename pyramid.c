#include<stdio.h>
int main()
{
    
    //outer loop for rows
    for(int i=1;i<=5;i++)
    {
        
        //first inner loop for spaces
        for (int j=5;j>=i;j--)
        {
            printf(" ");
        }  

        //second inner loop for printing stars
        for(int k=1;k<=i;k++){
            
            printf("*");
                  
        }
        //third inner loop for printing stars
        for (int l=2;l<=i;l++)
        {
            printf("*");
        } 
        printf("\n");
          
    }
    
   
   
    return 0;
}
