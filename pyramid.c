#include<stdio.h>
int main()
{
    int rows;
    printf("Enter the number of rows: ");
    scanf("%d",&rows);
    //outer loop for rows
    for(int i=1;i<=rows;i++)
    {
        
        //first inner loop for spaces
        for (int j=1;j<=rows-i;j++)
        {
            printf(" ");
        }  

        //second inner loop for printing stars
        for(int k=1;k<=i;k++){
            
            printf(" *");
                  
        }
        printf("\n");  
    }
    
   
   
    return 0;
}
